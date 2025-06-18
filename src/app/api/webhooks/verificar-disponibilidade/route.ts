import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { configuracoes, agendamentos, servicos } from "@/server/db/schema"
import { and, gte, lte, eq } from "drizzle-orm"
import dayjs from "dayjs"

interface RequestBody {
  data: string;
  horario: string;
  servico: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    const { data, horario, servico } = body

    console.log(`🔍 [WEBHOOK-DISPONIBILIDADE] Verificando:`, body)

    // Validar dados
    if (!data || !horario || !servico) {
      return NextResponse.json({ success: false, error: "Dados obrigatórios: data, horario, servico" }, { status: 400 })
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

    // CORREÇÃO: Buscar serviço da tabela servicos
    const servicoEncontrado = await db
      .select()
      .from(servicos)
      .where(and(eq(servicos.nome, servico), eq(servicos.ativo, true)))
      .limit(1)
      .then((rows) => rows[0])

    if (!servicoEncontrado) {
      return NextResponse.json({ success: false, error: `Serviço "${servico}" não encontrado` }, { status: 400 })
    }

    // Verificar agendamentos existentes no dia
    const dataInicio = dayjs(data).startOf("day").toDate()
    const dataFim = dayjs(data).endOf("day").toDate()

    const agendamentosExistentes = await db
      .select()
      .from(agendamentos)
      .where(
        and(
          gte(agendamentos.dataHora, dataInicio),
          lte(agendamentos.dataHora, dataFim),
          eq(agendamentos.status, "agendado"),
        ),
      )

    console.log(`🔍 [WEBHOOK-DISPONIBILIDADE] Agendamentos existentes no dia: ${agendamentosExistentes.length}`)

    // Verificar se o horário específico está ocupado
    const horarioSolicitado = dayjs(`${data}T${horario}`).toDate()
    const duracaoServico = servicoEncontrado.duracao || 30

    const conflito = agendamentosExistentes.some((agendamento) => {
      const inicioExistente = dayjs(agendamento.dataHora)
      const fimExistente = inicioExistente.add(duracaoServico, "minute")
      const inicioSolicitado = dayjs(horarioSolicitado)
      const fimSolicitado = inicioSolicitado.add(duracaoServico, "minute")

      // Verificar sobreposição
      return inicioSolicitado.isBefore(fimExistente) && fimSolicitado.isAfter(inicioExistente)
    })

    if (conflito) {
      // Gerar horários alternativos
      const horariosAlternativos = []
      const horaInicio = 9 // 09:00
      const horaFim = 18 // 18:00

      for (let hora = horaInicio; hora < horaFim; hora++) {
        for (const minuto of [0, 30]) {
          const horarioTeste = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`
          const dataHoraTeste = dayjs(`${data}T${horarioTeste}`).toDate()

          // Verificar se este horário está livre
          const temConflito = agendamentosExistentes.some((agendamento) => {
            const inicioExistente = dayjs(agendamento.dataHora)
            const fimExistente = inicioExistente.add(duracaoServico, "minute")
            const inicioTeste = dayjs(dataHoraTeste)
            const fimTeste = inicioTeste.add(duracaoServico, "minute")

            return inicioTeste.isBefore(fimExistente) && fimTeste.isAfter(inicioExistente)
          })

          if (!temConflito && horariosAlternativos.length < 5) {
            horariosAlternativos.push(horarioTeste)
          }
        }
      }

      return NextResponse.json({
        success: true,
        disponivel: false,
        motivo: "Horário já ocupado",
        horariosAlternativos,
      })
    }

    console.log(`✅ [WEBHOOK-DISPONIBILIDADE] Horário disponível!`)
    return NextResponse.json({
      success: true,
      disponivel: true,
    })
  } catch (error) {
    console.error("💥 [WEBHOOK-DISPONIBILIDADE] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
