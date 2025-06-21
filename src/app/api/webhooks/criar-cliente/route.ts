import { type NextRequest, NextResponse } from "next/server"
import { db, executeWithRetry } from "@/server/db"
import { clientes } from "@/server/db/schema"
import { eq } from "drizzle-orm"

interface RequestBody {
  telefone: string;
  nome: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    const { telefone, nome } = body

    console.log(`🆕 [WEBHOOK-CRIAR-CLIENTE] Criando cliente: ${nome} - ${telefone}`)

    if (!telefone || !nome) {
      return NextResponse.json({ success: false, error: "Telefone e nome são obrigatórios" }, { status: 400 })
    }

    // Limpar telefone
    const telefoneClean = telefone.replace(/\D/g, "")

    // Por enquanto, usar userId = 1 (primeiro usuário)
    // TODO: Implementar lógica para identificar o usuário correto
    const userId = 1

    // Verificar se já existe um cliente com este telefone com retry
    const clienteExistente = await executeWithRetry(() =>
      db
        .select()
        .from(clientes)
        .where(eq(clientes.telefone, telefoneClean))
        .limit(1)
        .then((rows) => (rows.length > 0 ? rows[0] : null)),
    )

    if (clienteExistente) {
      console.log(`ℹ️ [WEBHOOK-CRIAR-CLIENTE] Cliente já existe: ${clienteExistente.nome}`)
      return NextResponse.json({
        success: true,
        cliente: clienteExistente,
        jaExistia: true,
        message: `Cliente ${clienteExistente.nome} já estava cadastrado!`,
      })
    }

    // Criar novo cliente com retry
    const novoClienteResult = await executeWithRetry(() =>
      db
        .insert(clientes)
        .values({
          userId: userId,
          nome: nome.trim(),
          telefone: telefoneClean,
        })
        .returning(),
    )

    const novoCliente = novoClienteResult[0]

    if (!novoCliente) {
      throw new Error("Erro ao criar cliente")
    }

    console.log(`✅ [WEBHOOK-CRIAR-CLIENTE] Cliente criado: ${novoCliente.nome} (ID: ${novoCliente.id})`)

    return NextResponse.json({
      success: true,
      cliente: novoCliente,
      jaExistia: false,
      message: `Cliente ${novoCliente.nome} cadastrado com sucesso!`,
    })
  } catch (error) {
    console.error("💥 [WEBHOOK-CRIAR-CLIENTE] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Webhook criar-cliente ativo",
    timestamp: new Date().toISOString(),
  })
}
