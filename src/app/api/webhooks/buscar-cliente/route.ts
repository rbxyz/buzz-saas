import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { clientes, agendamentos } from "@/server/db/schema"
import { eq, desc } from "drizzle-orm"
import { type InferSelectModel } from "drizzle-orm"

type Agendamento = InferSelectModel<typeof agendamentos>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telefone = searchParams.get("telefone")

    console.log(`🔍 [WEBHOOK-CLIENTE] Buscando cliente: ${telefone}`)

    if (!telefone) {
      return NextResponse.json({ success: false, error: "Telefone é obrigatório" }, { status: 400 })
    }

    // Limpar telefone
    const telefoneClean = telefone.replace(/\D/g, "")

    // Buscar cliente
    const cliente = await db
      .select()
      .from(clientes)
      .where(eq(clientes.telefone, telefoneClean))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    // Buscar agendamentos do cliente (se existir)
    let agendamentosCliente: Agendamento[] = []
    if (cliente) {
      agendamentosCliente = await db
        .select()
        .from(agendamentos)
        .where(eq(agendamentos.clienteId, cliente.id))
        .orderBy(desc(agendamentos.dataHora))
        .limit(10)
    }

    console.log(`✅ [WEBHOOK-CLIENTE] Cliente: ${cliente?.nome ?? "Não encontrado"}`)
    console.log(`✅ [WEBHOOK-CLIENTE] Agendamentos: ${agendamentosCliente.length}`)

    return NextResponse.json({
      success: true,
      cliente,
      agendamentos: agendamentosCliente,
      encontrado: !!cliente,
      telefone: telefoneClean,
    })
  } catch (error) {
    console.error("💥 [WEBHOOK-CLIENTE] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
