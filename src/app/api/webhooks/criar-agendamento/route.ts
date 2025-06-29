import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { configuracoes, clientes, agendamentos, servicos, intervalosTrabalho } from "@/server/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import dayjs from "dayjs"

interface RequestBody {
  telefone: string;
  nome: string;
  servico: string;
  data: string;
  horario: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    const { telefone, nome, servico, data, horario } = body

    console.log(`🚀 [WEBHOOK-CRIAR-AGENDAMENTO] Criando agendamento:`, body)

    // Validar dados
    if (!telefone || !nome || !servico || !data || !horario) {
      return NextResponse.json(
        { success: false, error: "Dados obrigatórios: telefone, nome, servico, data, horario" },
        { status: 400 },
      )
    }

    // Limpar telefone
    const telefoneClean = telefone.replace(/\D/g, "")

    // Verificar/criar cliente
    let cliente = await db
      .select()
      .from(clientes)
      .where(eq(clientes.telefone, telefoneClean))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!cliente) {
      console.log(`🆕 [WEBHOOK-CRIAR-AGENDAMENTO] Criando novo cliente: ${nome} (${telefoneClean})`)
      const novoCliente = await db
        .insert(clientes)
        .values({
          nome,
          telefone: telefoneClean,
          userId: 1, // Usar userId padrão
        })
        .returning()

      cliente = novoCliente[0]!
      console.log(`✅ [WEBHOOK-CRIAR-AGENDAMENTO] Cliente criado com ID: ${cliente.id}`)
    } else {
      console.log(`👤 [WEBHOOK-CRIAR-AGENDAMENTO] Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})`)
    }

    // Buscar configuração
    const config = await db
      .select()
      .from(configuracoes)
      .limit(1)
      .then((rows) => rows[0])

    if (!config) {
      return NextResponse.json({ success: false, error: "Configuração não encontrada" }, { status: 500 })
    }

    // CORREÇÃO: Buscar serviços da tabela servicos, não do JSON
    console.log(`🔍 [WEBHOOK-CRIAR-AGENDAMENTO] Buscando serviços da tabela servicos`)
    const servicosDisponiveis = await db.select().from(servicos).where(eq(servicos.ativo, true))

    console.log(
      `📋 [WEBHOOK-CRIAR-AGENDAMENTO] Serviços encontrados:`,
      servicosDisponiveis.map((s) => s.nome),
    )

    // Encontrar serviço
    const servicoSelecionado = servicosDisponiveis.find((s) => s.nome.toLowerCase() === servico.toLowerCase())

    if (!servicoSelecionado) {
      console.log(`❌ [WEBHOOK-CRIAR-AGENDAMENTO] Serviço "${servico}" não encontrado`)
      return NextResponse.json(
        {
          success: false,
          error: `Serviço "${servico}" não encontrado. Serviços disponíveis: ${servicosDisponiveis.map((s) => s.nome).join(", ")}`,
        },
        { status: 400 },
      )
    }

    console.log(`✅ [WEBHOOK-CRIAR-AGENDAMENTO] Serviço encontrado: ${servicoSelecionado.nome}`)

    // --- VALIDAÇÃO DE DISPONIBILIDADE FINAL ---
    const diaSemana = dayjs(data).day()
    const intervalosDoDia = await db
      .select()
      .from(intervalosTrabalho)
      .where(and(eq(intervalosTrabalho.diaSemana, diaSemana), eq(intervalosTrabalho.ativo, true)))

    if (intervalosDoDia.length === 0) {
      return NextResponse.json({ success: false, error: `Desculpe, não atendemos no dia ${dayjs(data).format("DD/MM/YYYY")}.` }, { status: 400 });
    }

    const dataHora = dayjs(`${data}T${horario}`)
    const duracaoMinutos = servicoSelecionado.duracao

    const agendamentosNoDia = await db.select().from(agendamentos).where(and(
      gte(agendamentos.dataHora, dataHora.startOf('day').toDate()),
      lte(agendamentos.dataHora, dataHora.endOf('day').toDate()),
      eq(agendamentos.status, "agendado")
    ));

    const temConflito = agendamentosNoDia.some(ag => {
      const inicioExistente = dayjs(ag.dataHora);
      const fimExistente = inicioExistente.add(ag.duracaoMinutos, "minute");
      return dataHora.isBefore(fimExistente) && dataHora.add(duracaoMinutos, "minute").isAfter(inicioExistente);
    });

    if (temConflito) {
      return NextResponse.json({ success: false, error: `O horário das ${horario} já foi reservado. Por favor, tente outro.` }, { status: 409 }); // 409 Conflict
    }
    // --- FIM DA VALIDAÇÃO ---

    // Criar agendamento
    const novoAgendamento = await db
      .insert(agendamentos)
      .values({
        userId: cliente.userId,
        clienteId: cliente.id,
        servicoId: servicoSelecionado.id,
        servico: servicoSelecionado.nome,
        duracaoMinutos: servicoSelecionado.duracao,
        valorCobrado: servicoSelecionado.preco,
        dataHora: dataHora.toDate(),
        status: "agendado",
        observacoes: `Agendamento criado via WhatsApp - Valor: R$ ${Number(servicoSelecionado.preco).toFixed(2)}`,
      })
      .returning()

    const agendamento = novoAgendamento[0]!
    console.log(`✅ [WEBHOOK-CRIAR-AGENDAMENTO] Agendamento criado com ID: ${agendamento.id}`)

    // Formatar mensagem de confirmação
    const mensagem = `🎉 **Agendamento confirmado!**

📋 **Resumo:**
• Cliente: ${cliente.nome}
• Serviço: ${servicoSelecionado.nome}
• Data: ${dayjs(data).format("DD/MM/YYYY")}
• Horário: ${horario}
• Valor: R$ ${Number(servicoSelecionado.preco).toFixed(2)}

📍 ${config.endereco ?? "Endereço na bio"}

Chegue 10 min antes! Até lá! 😊💈`

    return NextResponse.json({
      success: true,
      agendamento,
      message: mensagem,
    })
  } catch (error) {
    console.error("💥 [WEBHOOK-CRIAR-AGENDAMENTO] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
