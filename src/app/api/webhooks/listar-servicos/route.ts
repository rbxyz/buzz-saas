import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { configuracoes } from "@/server/db/schema"

interface ServicoConfigurado {
  nome: string
  preco: number
  duracaoMinutos: number
}

export async function GET(request: NextRequest) {
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

    // Extrair serviços
    let servicos: ServicoConfigurado[] = []
    if (config.servicos && Array.isArray(config.servicos)) {
      servicos = config.servicos as ServicoConfigurado[]
    } else {
      // Serviços padrão
      servicos = [
        { nome: "Corte", preco: 25.0, duracaoMinutos: 30 },
        { nome: "Barba", preco: 15.0, duracaoMinutos: 20 },
        { nome: "Corte + Barba", preco: 35.0, duracaoMinutos: 45 },
      ]
    }

    console.log(`✅ [WEBHOOK-SERVICOS] ${servicos.length} serviços encontrados`)

    return NextResponse.json({
      success: true,
      servicos,
      configuracao: {
        nome: config.nome,
        telefone: config.telefone,
        endereco: config.endereco,
        horaInicio: config.horaInicio,
        horaFim: config.horaFim,
        dias: config.dias,
      },
    })
  } catch (error) {
    console.error("💥 [WEBHOOK-SERVICOS] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
