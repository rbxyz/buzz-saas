import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversations, messages, clientes } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { aiService } from "@/lib/ai-service"
import { enviarMensagemWhatsApp } from "@/lib/zapi-service"

// Tipos para o webhook da Z-API
interface WebhookBody {
  // Campos originais
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
  data?: any

  // Novos campos específicos do Z-API
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

type MessageTipo = "texto" | "imagem" | "audio" | "documento"

interface Conversation {
  id: string
  clienteId: string | null
  telefone: string
  status: "ativa" | "encerrada" | "pausada"
  ultimaMensagem: Date | null
  metadata: unknown
  createdAt: Date | null
  updatedAt: Date | null
}

interface DbMessage {
  id: string
  conversationId: string
  remetente: "cliente" | "bot" | "atendente"
  conteudo: string
  tipo: MessageTipo
  metadata?: unknown
  createdAt: Date | null
}

export async function POST(request: NextRequest) {
  try {
    let body: WebhookBody

    try {
      body = (await request.json()) as WebhookBody
    } catch (error) {
      console.error("❌ [WEBHOOK] Erro ao analisar JSON:", error)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    console.log(`📨 [WEBHOOK] Recebido:`, JSON.stringify(body, null, 2))

    // Verificar se é uma mensagem de callback de recebimento
    if (body.type !== "ReceivedCallback") {
      console.log(`🔄 [WEBHOOK] Ignorando evento que não é ReceivedCallback: ${body.type}`)
      return NextResponse.json({ success: true, ignored: true })
    }

    // Ignorar mensagens enviadas pelo próprio sistema (fromMe: true)
    if (body.fromMe === true) {
      console.log(`🔄 [WEBHOOK] Ignorando mensagem enviada pelo sistema`)
      return NextResponse.json({ success: true, ignored: true })
    }

    // Ignorar mensagens de grupos
    if (body.isGroup === true) {
      console.log(`🔄 [WEBHOOK] Ignorando mensagem de grupo`)
      return NextResponse.json({ success: true, ignored: true })
    }

    // Extrair informações da mensagem do formato Z-API
    const phone = body.phone || ""
    const messageText = body.text?.message || body.body || ""
    const messageId = body.messageId || ""
    const timestamp = body.momment || Date.now()
    const senderName = body.senderName || ""

    // Verificar se temos os dados mínimos necessários
    if (!phone || !messageText) {
      console.log(`❌ [WEBHOOK] Dados insuficientes: telefone=${phone}, mensagem=${messageText}`)
      return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 })
    }

    console.log(`📱 [WEBHOOK] Processando mensagem válida de ${phone}: "${messageText}"`)
    console.log(`👤 [WEBHOOK] Nome do remetente: ${senderName || "Não informado"}`)

    // Processar a mensagem recebida de forma assíncrona
    // Não esperamos a conclusão para responder rapidamente ao webhook
    processIncomingMessage({
      phone,
      message: messageText,
      messageId,
      timestamp,
      senderName,
    }).catch((error) => {
      console.error("💥 [WEBHOOK] Erro ao processar mensagem:", error)
    })

    // Responder imediatamente para evitar timeout
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("💥 [WEBHOOK] Erro:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

async function processIncomingMessage(data: {
  phone: string
  message: string
  messageId: string
  timestamp: number
  senderName?: string
}): Promise<void> {
  try {
    const { phone, message, messageId, timestamp, senderName } = data

    console.log(`📱 [WEBHOOK] Processando mensagem de ${phone}:`, message)

    // Limpar telefone (remover caracteres especiais)
    const telefoneClean = phone.replace(/\D/g, "")

    // Buscar ou criar conversa
    let conversation: Conversation | null = await db
      .select()
      .from(conversations)
      .where(eq(conversations.telefone, telefoneClean))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!conversation) {
      console.log(`🆕 [WEBHOOK] Criando nova conversa para ${telefoneClean}`)
      conversation = await db
        .insert(conversations)
        .values({
          telefone: telefoneClean,
          status: "ativa",
          ultimaMensagem: null, // Deixar null inicialmente
        })
        .returning()
        .then((rows) => rows[0] ?? null)
    }

    if (!conversation) {
      throw new Error("Erro ao criar ou encontrar conversa!")
    }

    // Buscar cliente pelo telefone
    let cliente = await db
      .select()
      .from(clientes)
      .where(eq(clientes.telefone, telefoneClean))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    // Se temos o nome do remetente e não temos cliente, criar um novo cliente
    if (!cliente && senderName && senderName.trim() !== "") {
      console.log(`🆕 [WEBHOOK] Criando novo cliente com nome do WhatsApp: ${senderName}`)
      cliente = await db
        .insert(clientes)
        .values({
          nome: senderName,
          telefone: telefoneClean,
        })
        .returning()
        .then((rows) => rows[0] ?? null)

      // Atualizar a conversa com o ID do cliente
      if (cliente) {
        await db.update(conversations).set({ clienteId: cliente.id }).where(eq(conversations.id, conversation.id))

        console.log(`✅ [WEBHOOK] Cliente criado e vinculado à conversa: ${cliente.id}`)
      }
    }

    // Salvar mensagem do cliente
    await db.insert(messages).values({
      conversationId: conversation.id,
      remetente: "cliente",
      conteudo: message,
      tipo: "texto",
      metadata: { messageId, timestamp },
    })

    // Buscar histórico da conversa
    const conversationHistory: DbMessage[] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt)
      .limit(20)

    console.log(`🧠 [WEBHOOK] Processando com IA. Histórico: ${conversationHistory.length} mensagens`)

    // Processar mensagem com IA
    const aiResponse = await aiService.processMessage(
      message,
      telefoneClean,
      conversationHistory.map((msg) => ({
        role: msg.remetente === "cliente" ? "user" : "assistant",
        content: msg.conteudo,
      })),
    )

    console.log(`💾 [WEBHOOK] Salvando resposta da IA: ${aiResponse.message.substring(0, 50)}...`)

    // Salvar resposta da IA
    await db.insert(messages).values({
      conversationId: conversation.id,
      remetente: "bot",
      conteudo: aiResponse.message,
      tipo: "texto",
    })

    console.log(`📤 [WEBHOOK] Enviando resposta via WhatsApp para ${telefoneClean}`)

    // Enviar resposta via WhatsApp
    const sendResult = await enviarMensagemWhatsApp(telefoneClean, aiResponse.message)

    if (!sendResult.success) {
      console.error(`❌ [WEBHOOK] Erro ao enviar mensagem WhatsApp:`, sendResult.error)
    } else {
      console.log(`✅ [WEBHOOK] Mensagem WhatsApp enviada com sucesso`)
    }

    // Processar ações específicas se necessário
    if (aiResponse.action) {
      console.log(`🎬 [WEBHOOK] Processando ação: ${aiResponse.action}`)
      await handleAIAction(aiResponse.action, aiResponse.data, conversation.id, telefoneClean, message)
    }

    // Atualizar última mensagem da conversa
    await db
      .update(conversations)
      .set({
        ultimaMensagem: aiResponse.message.substring(0, 100), // Salvar o texto da mensagem
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id))

    console.log(`✅ [WEBHOOK] Processamento de mensagem concluído para ${telefoneClean}`)
  } catch (error) {
    console.error("💥 [WEBHOOK] Erro ao processar mensagem:", error)
  }
}

async function handleAIAction(
  action: string,
  data: unknown,
  conversationId: string,
  phone: string,
  userMessage: string,
): Promise<void> {
  try {
    console.log(`🎬 [WEBHOOK-ACTION] Iniciando ação ${action}`)

    switch (action) {
      case "agendar_direto":
        // Já processado na resposta da IA
        console.log(`📅 [WEBHOOK-ACTION] Agendamento direto já processado`)
        break
      case "listar_servicos":
        // Já processado na resposta da IA
        console.log(`📋 [WEBHOOK-ACTION] Listando serviços (já processado na resposta da IA)`)
        break
      case "listar_horarios":
        // Já processado na resposta da IA
        console.log(`⏰ [WEBHOOK-ACTION] Listando horários (já processado na resposta da IA)`)
        break
      case "consultar_agendamentos":
        // Já processado na resposta da IA
        console.log(`🔍 [WEBHOOK-ACTION] Consultando agendamentos (já processado na resposta da IA)`)
        break
      case "cancelar":
        await processCancelamento(data, conversationId, phone)
        break
      case "reagendar":
        await processReagendamento(data, conversationId, phone)
        break
      default:
        console.log(`❓ [WEBHOOK-ACTION] Ação desconhecida: ${action}`)
    }

    console.log(`✅ [WEBHOOK-ACTION] Ação ${action} concluída`)
  } catch (error) {
    console.error("💥 [WEBHOOK-ACTION] Erro ao processar ação da IA:", error)
  }
}

async function processCancelamento(data: unknown, conversationId: string, phone: string): Promise<void> {
  console.log("🔄 [WEBHOOK-CANCELAMENTO] Processando cancelamento:", data)

  await enviarMensagemWhatsApp(
    phone,
    "Para cancelar um agendamento, entre em contato conosco diretamente. Em breve teremos essa funcionalidade automatizada! 📞",
  )
}

async function processReagendamento(data: unknown, conversationId: string, phone: string): Promise<void> {
  console.log("🔄 [WEBHOOK-REAGENDAMENTO] Processando reagendamento:", data)

  await enviarMensagemWhatsApp(
    phone,
    "Para reagendar, entre em contato conosco diretamente. Em breve teremos essa funcionalidade automatizada! 📞",
  )
}

// Endpoint para verificar status do webhook
export async function GET() {
  return NextResponse.json({
    status: "Webhook Z-API ativo",
    timestamp: new Date().toISOString(),
  })
}
