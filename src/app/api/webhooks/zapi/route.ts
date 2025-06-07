import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversations, messages } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { aiService } from "@/lib/ai-service"
import { createZApiService, getZApiConfigFromDB } from "@/lib/zapi-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verificar se é uma mensagem recebida
    if (body.event === "message-received") {
      await handleIncomingMessage(body.data)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro no webhook Z-API:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

async function handleIncomingMessage(messageData: any) {
  try {
    const { phone, message, messageId, timestamp } = messageData

    // Buscar ou criar conversa
    let conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.telefone, phone))
      .limit(1)
      .then((rows) => rows[0] || null)

    if (!conversation) {
      // Criar nova conversa
      conversation = await db
        .insert(conversations)
        .values({
          telefone: phone,
          status: "ativa",
          ultimaMensagem: new Date(),
        })
        .returning()
        .then((rows) => rows[0])
    }

    // Salvar mensagem do cliente
    await db.insert(messages).values({
      conversationId: conversation.id,
      remetente: "cliente",
      conteudo: message.text || message.body || "",
      tipo: message.type || "texto",
      metadata: { messageId, timestamp },
    })

    // Buscar histórico da conversa
    const conversationHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt)
      .limit(10) // Últimas 10 mensagens

    // Processar mensagem com IA
    const aiResponse = await aiService.processMessage(
      message.text || message.body || "",
      phone,
      conversationHistory.map((msg) => ({
        role: msg.remetente === "cliente" ? "user" : "assistant",
        content: msg.conteudo,
      })),
    )

    // Salvar resposta da IA
    await db.insert(messages).values({
      conversationId: conversation.id,
      remetente: "bot",
      conteudo: aiResponse.message,
      tipo: "texto",
    })

    // Enviar resposta via WhatsApp
    const zapiConfig = await getZApiConfigFromDB()
    if (zapiConfig) {
      const zapiService = createZApiService(zapiConfig.instanceId, zapiConfig.token)

      await zapiService.sendMessage({
        phone,
        message: aiResponse.message,
      })
    }

    // Processar ações específicas se necessário
    if (aiResponse.action) {
      await handleAIAction(aiResponse.action, aiResponse.data, conversation.id, phone)
    }
  } catch (error) {
    console.error("Erro ao processar mensagem:", error)
  }
}

async function handleAIAction(action: string, data: any, conversationId: string, phone: string) {
  try {
    switch (action) {
      case "agendar":
        // Lógica para processar agendamento
        await processAgendamento(data, conversationId, phone)
        break

      case "listar_servicos":
        // Lógica para listar serviços
        await sendServicos(phone)
        break

      case "listar_horarios":
        // Lógica para listar horários
        await sendHorarios(phone)
        break

      case "cancelar":
        // Lógica para cancelar agendamento
        await processCancelamento(data, conversationId, phone)
        break

      case "reagendar":
        // Lógica para reagendar
        await processReagendamento(data, conversationId, phone)
        break
    }
  } catch (error) {
    console.error("Erro ao processar ação da IA:", error)
  }
}

async function processAgendamento(data: any, conversationId: string, phone: string) {
  // Implementar lógica de agendamento
  console.log("Processando agendamento:", data)
}

async function sendServicos(phone: string) {
  // Implementar envio de lista de serviços
  console.log("Enviando serviços para:", phone)
}

async function sendHorarios(phone: string) {
  // Implementar envio de horários disponíveis
  console.log("Enviando horários para:", phone)
}

async function processCancelamento(data: any, conversationId: string, phone: string) {
  // Implementar lógica de cancelamento
  console.log("Processando cancelamento:", data)
}

async function processReagendamento(data: any, conversationId: string, phone: string) {
  // Implementar lógica de reagendamento
  console.log("Processando reagendamento:", data)
}

// Endpoint para verificar status do webhook
export async function GET() {
  return NextResponse.json({
    status: "Webhook Z-API ativo",
    timestamp: new Date().toISOString(),
  })
}
