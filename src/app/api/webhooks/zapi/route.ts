import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversations, messages, clientes, users, messageRoleEnum } from "@/server/db/schema"
import { eq, desc } from "drizzle-orm"
import { aiService } from "@/lib/ai-service"
import { enviarMensagemWhatsApp } from "@/lib/zapi-service"
import { type CoreMessage } from "ai"
import { env } from "@/env"

// Configurações do runtime
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 25

// Tipos para o webhook da Z-API
interface WebhookBody {
  phone?: string
  fromMe?: boolean
  chatName?: string
  senderName?: string
  messageId?: string
  type?: string
  body?: string
  text?: {
    message?: string
  }
  isGroup?: boolean
  timestamp?: number
  instanceId?: string
  message?: {
    text?: string
    body?: string
    type?: string
  }
  event?: string
  data?: unknown
  isStatusReply?: boolean
  chatLid?: string | null
  connectedPhone?: string
  waitingMessage?: boolean
  isEdit?: boolean
  isNewsletter?: boolean
  momment?: number
  status?: string
  senderPhoto?: string | null
  photo?: string
  broadcast?: boolean
  participantLid?: string | null
  forwarded?: boolean
  fromApi?: boolean
}

interface ConversationData {
  id: number
  userId: number
  clienteId: number | null
  telefone: string
  nomeContato: string | null
  ultimaMensagem: string | null
  ultimaInteracao: Date
  ativa: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

// Timeout configurável: PROCESS_TIMEOUT_MS (ms) – default 15000
const DEFAULT_TIMEOUT = Number(process.env.PROCESS_TIMEOUT_MS) || 15000

// Função para executar operações do banco com timeout
async function executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs = DEFAULT_TIMEOUT): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.error(`⏰ [TIMEOUT] Operação cancelada após ${timeoutMs}ms`)
    controller.abort()
  }, timeoutMs)

  try {
    console.log(`⏳ [DB] Executando operação com timeout de ${timeoutMs}ms...`)
    const result = await operation()
    clearTimeout(timeoutId)
    console.log(`✅ [DB] Operação concluída com sucesso`)
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    console.error(`💥 [DB] Erro na operação:`, error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log("🟢 [WEBHOOK_V2] Executando a versão corrigida do webhook.")
  const startTime = Date.now()
  console.log(`🚀 [WEBHOOK] Iniciando processamento do webhook Z-API`)

  try {
    let body: WebhookBody
    try {
      body = (await request.json()) as WebhookBody
      console.log(`📨 [WEBHOOK] Dados recebidos:`, {
        type: body.type,
        phone: body.phone,
        fromMe: body.fromMe,
        isGroup: body.isGroup,
        messagePreview: body.text?.message?.substring(0, 50) ?? body.body?.substring(0, 50),
      })
    } catch (error) {
      console.error("❌ [WEBHOOK] Erro ao fazer parse do JSON:", error)
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    // Validações básicas
    if (body.type !== "ReceivedCallback") {
      console.log(`🔄 [WEBHOOK] Ignorando evento: ${body.type}`)
      return NextResponse.json({ success: true, ignored: true, reason: "not_received_callback" })
    }

    if (body.fromMe === true) {
      console.log(`🔄 [WEBHOOK] Ignorando mensagem própria`)
      return NextResponse.json({ success: true, ignored: true, reason: "from_me" })
    }

    if (body.isGroup === true) {
      console.log(`🔄 [WEBHOOK] Ignorando mensagem de grupo`)
      return NextResponse.json({ success: true, ignored: true, reason: "group_message" })
    }

    // Extrair dados da mensagem
    const phone = body.phone?.replace(/\D/g, "") ?? ""
    const messageText = body.text?.message ?? body.body ?? ""
    const messageId = body.messageId ?? `${Date.now()}-${Math.random()}`
    const timestamp = body.momment ?? body.timestamp ?? Date.now()
    const senderName = body.senderName ?? body.chatName ?? ""

    if (!phone || !messageText.trim()) {
      console.log(`❌ [WEBHOOK] Dados insuficientes - phone: ${phone}, message: ${messageText}`)
      return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 })
    }

    console.log(`✅ [WEBHOOK] Mensagem válida de ${phone}: "${messageText.substring(0, 100)}..."`)

    // Verificar se as variáveis de ambiente estão configuradas
    console.log(`🔍 [WEBHOOK] Verificando configuração via variáveis de ambiente...`)

    const groqApiKey = process.env.GROQ_API_KEY
    const zapiInstanceId = process.env.ZAPI_INSTANCE_ID
    const zapiToken = process.env.ZAPI_TOKEN
    const zapiClientToken = process.env.ZAPI_CLIENT_TOKEN

    if (!groqApiKey || !zapiInstanceId || !zapiToken || !zapiClientToken) {
      console.log(`❌ [WEBHOOK] Variáveis de ambiente não configuradas:`, {
        groq: !!groqApiKey,
        instance: !!zapiInstanceId,
        token: !!zapiToken,
        clientToken: !!zapiClientToken
      })
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "environment_variables_missing"
      })
    }

    console.log(`✅ [WEBHOOK] Todas as variáveis de ambiente configuradas`)

    // O processamento agora será síncrono para garantir a execução em ambiente serverless.
    // A resposta ao webhook só será enviada após a conclusão.
    try {
      await processMessage({
        phone,
        messageText,
        messageId,
        timestamp,
        senderName,
      })

      const processingTime = Date.now() - startTime
      console.log(`⚡ [WEBHOOK] Resposta enviada após processamento completo em ${processingTime}ms`)
      return NextResponse.json({
        success: true,
        processingTime,
        status: "processed",
      })

    } catch (processingError) {
      console.error(`💥 [WEBHOOK] Erro durante o processamento da mensagem:`, processingError)
      // Mesmo com erro no processamento, retornamos 200 para o Z-API não reenviar.
      // O erro já foi logado.
      return NextResponse.json({
        success: false,
        status: "error_during_processing",
        error: processingError instanceof Error ? processingError.message : "Erro desconhecido",
      })
    }
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`💥 [WEBHOOK] Erro principal (${processingTime}ms):`, error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        processingTime,
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 },
    )
  }
}

async function processMessage(data: {
  phone: string
  messageText: string
  messageId: string
  timestamp: number
  senderName: string
}): Promise<void> {
  const { phone, messageText, messageId, timestamp, senderName } = data
  const processStart = Date.now()

  console.log(`🔄 [PROCESS] Iniciando processamento para ${phone}`)

  try {
    // 1. Buscar usuário (assumir primeiro usuário como padrão)
    console.log(`👤 [PROCESS] Buscando usuário...`)

    let userId: number
    const forcedId = Number(env.CHATBOT_USER_ID)
    if (!Number.isNaN(forcedId) && forcedId > 0) {
      userId = forcedId
      console.log(`👤 [PROCESS] Usando CHATBOT_USER_ID=${userId}`)
    } else {
      const user = await executeWithTimeout(() => db.select({ id: users.id }).from(users).limit(1))
      console.log(`👤 [PROCESS] Resultado da consulta de usuários:`, user)

      if (!user || user.length === 0) {
        console.error(`❌ [PROCESS] Nenhum usuário encontrado no sistema`)
        throw new Error("Nenhum usuário encontrado no sistema")
      }
      userId = user[0]!.id
    }
    console.log(`✅ [PROCESS] Usuário encontrado: ${userId}`)

    // 2. Buscar ou criar conversa
    console.log(`💬 [PROCESS] Buscando conversa...`)
    const conversation = await executeWithTimeout(() =>
      db.select().from(conversations).where(eq(conversations.telefone, phone)).limit(1),
    )
    console.log(`💬 [PROCESS] Resultado da consulta de conversa:`, conversation?.length || 0, "registros")

    let conversationData: ConversationData
    if (!conversation || conversation.length === 0) {
      console.log(`🆕 [PROCESS] Criando nova conversa`)
      const newConversation = await executeWithTimeout(() =>
        db
          .insert(conversations)
          .values({
            userId,
            telefone: phone,
            nomeContato: senderName || null,
            ativa: true,
            ultimaMensagem: messageText.substring(0, 500),
            ultimaInteracao: new Date(),
          })
          .returning(),
      )
      conversationData = newConversation[0]!
      console.log(`✅ [PROCESS] Nova conversa criada: ${conversationData.id}`)
    } else {
      conversationData = conversation[0]!
      console.log(`✅ [PROCESS] Conversa existente encontrada: ${conversationData.id}`)
      // Atualizar última interação
      await executeWithTimeout(() =>
        db
          .update(conversations)
          .set({
            ultimaMensagem: messageText.substring(0, 500),
            ultimaInteracao: new Date(),
            nomeContato: senderName || conversationData.nomeContato,
          })
          .where(eq(conversations.id, conversationData.id)),
      )
      console.log(`✅ [PROCESS] Conversa atualizada`)
    }

    // 3. Buscar ou criar cliente
    console.log(`👥 [PROCESS] Buscando cliente...`)
    const cliente = await executeWithTimeout(() =>
      db.select().from(clientes).where(eq(clientes.telefone, phone)).limit(1),
    )
    console.log(`👥 [PROCESS] Cliente encontrado:`, cliente?.length || 0, "registros")

    if ((!cliente || cliente.length === 0) && senderName) {
      console.log(`🆕 [PROCESS] Criando novo cliente com nome: ${senderName}`)
      const newCliente = await executeWithTimeout(() =>
        db
          .insert(clientes)
          .values({
            userId,
            nome: senderName,
            telefone: phone,
          })
          .returning(),
      )

      if (newCliente && newCliente.length > 0) {
        // Vincular cliente à conversa
        await executeWithTimeout(() =>
          db
            .update(conversations)
            .set({ clienteId: newCliente[0]!.id })
            .where(eq(conversations.id, conversationData.id)),
        )
        console.log(`✅ [PROCESS] Cliente criado e vinculado: ${newCliente[0]!.id}`)
      }
    } else if (cliente && cliente.length > 0) {
      console.log(`✅ [PROCESS] Cliente existente: ${cliente[0]!.id}`)
    }

    // 4. Salvar mensagem do usuário
    console.log(`💾 [PROCESS] Salvando mensagem do usuário...`)
    await executeWithTimeout(() =>
      db.insert(messages).values({
        conversationId: conversationData.id,
        content: messageText,
        role: "user",
        timestamp: new Date(timestamp),
        messageId,
      }),
    )
    console.log(`✅ [PROCESS] Mensagem do usuário salva`)

    // 5. Buscar histórico da conversa
    console.log(`📚 [PROCESS] Buscando histórico...`)
    const history = await executeWithTimeout(() =>
      db
        .select({
          content: messages.content,
          role: messages.role,
          timestamp: messages.timestamp,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversationData.id))
        .orderBy(desc(messages.timestamp))
        .limit(10),
    )

    const conversationHistory: CoreMessage[] = history
      .reverse()
      .filter(
        (msg) => msg.role === "user" || msg.role === "assistant",
      )
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

    console.log(`✅ [PROCESS] Histórico obtido: ${conversationHistory.length} mensagens`)

    // 6. Processar com IA
    console.log(`🤖 [PROCESS] Chamando serviço de IA...`)
    const aiResponse = await aiService.processMessage(messageText, phone, conversationHistory)
    console.log(`✅ [PROCESS] Resposta da IA recebida: "${aiResponse.message?.substring(0, 50)}..."`)

    // 7. Salvar resposta da IA e enviar
    if (aiResponse.message) {
      console.log(`💾 [PROCESS] Salvando resposta da IA...`)
      await executeWithTimeout(() =>
        db.insert(messages).values({
          conversationId: conversationData.id,
          content: aiResponse.message,
          role: "assistant",
          timestamp: new Date(),
        }),
      )
      console.log(`✅ [PROCESS] Resposta da IA salva`)

      console.log(`📤 [PROCESS] Enviando mensagem via WhatsApp...`)
      const enviado = await enviarMensagemWhatsApp(phone, aiResponse.message)
      console.log(`${enviado ? '✅' : '❌'} [PROCESS] Mensagem WhatsApp: ${enviado ? 'enviada' : 'falhou'}`)
    }

    const totalTime = Date.now() - processStart
    console.log(`🎉 [PROCESS] Processamento concluído em ${totalTime}ms para ${phone}`)

  } catch (dbError) {
    console.error(`💥 [PROCESS] Erro específico na consulta de usuário:`, dbError)
    throw dbError
  }
}

// Endpoint GET para verificar status
export async function GET() {
  return NextResponse.json({
    status: "Webhook Z-API ativo",
    timestamp: new Date().toISOString(),
    version: "2.0",
  })
}
