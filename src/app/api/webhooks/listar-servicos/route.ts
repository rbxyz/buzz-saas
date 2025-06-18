import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { configuracoes, servicos } from "@/server/db/schema"
import { eq } from "drizzle-orm"

export async function GET(_request: NextRequest) {
  try {
    console.log(`📋 [WEBHOOK-SERVICOS] Buscando serviços`)

    // Buscar configuração
    const config = await db
      .select()
      .from(configuracoes)
      .limit(1)
      .then((rows) => rows[0])

    if (!config) {
      console.log(`❌ [WEBHOOK-SERVICOS] Configuração não encontrada`)
      return NextResponse.json({ success: false, error: "Configuração não encontrada" }, { status: 500 })
    }

    // CORREÇÃO: Buscar serviços da tabela servicos
    console.log(`🔍 [WEBHOOK-SERVICOS] Buscando serviços da tabela servicos`)
    const servicosDisponiveis = await db.select().from(servicos).where(eq(servicos.ativo, true))

    // Converter para o formato esperado
    const servicosFormatados = servicosDisponiveis.map((servico) => ({
      nome: servico.nome,
      preco: Number(servico.preco),
      duracaoMinutos: servico.duracao,
    }))

    console.log(
      `✅ [WEBHOOK-SERVICOS] ${servicosFormatados.length} serviços encontrados:`,
      servicosFormatados.map((s) => s.nome),
    )

    return NextResponse.json({
      success: true,
      servicos: servicosFormatados,
      configuracao: {
        nome_empresa: config.nomeEmpresa,
        telefone: config.telefone,
        endereco: config.endereco,
        horaInicio: "09:00", // Valores padrão por enquanto
        horaFim: "18:00",
        dias: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
      },
    })
  } catch (error) {
    console.error("💥 [WEBHOOK-SERVICOS] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
