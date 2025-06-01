import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { configuracoes } from "@/server/db/schema"
import { eq } from "drizzle-orm"

interface ConfiguracaoRow {
  chave: string | null
  valor: string | null
}

type ConfigsObj = Record<string, string>

export async function GET() {
  try {
    const configs = (await db.select().from(configuracoes)) as unknown as ConfiguracaoRow[]
    // Transforma o array [{chave, valor}] em objeto { chave: valor }
    const configsObj: ConfigsObj = {}
    for (const config of configs) {
      if (config.chave && typeof config.chave === "string" && config.valor && typeof config.valor === "string") {
        configsObj[config.chave] = config.valor
      }
    }
    return NextResponse.json(configsObj)
  } catch (error) {
    console.error("Erro ao buscar configurações:", error)
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const dados = (await request.json()) as ConfigsObj

    // Para cada chave-valor, faz upsert (update se existe, insert se não)
    for (const [chave, valor] of Object.entries(dados)) {
      if (typeof chave === "string" && typeof valor === "string") {
        const existente = await db.select().from(configuracoes).where(eq(configuracoes.chave, chave)).limit(1)

        if (existente.length > 0) {
          await db.update(configuracoes).set({ valor }).where(eq(configuracoes.chave, chave))
        } else {
          await db.insert(configuracoes).values({ chave, valor })
        }
      }
    }

    return NextResponse.json({ message: "Configurações salvas com sucesso." })
  } catch (error) {
    console.error("Erro ao salvar configurações:", error)
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 })
  }
}
