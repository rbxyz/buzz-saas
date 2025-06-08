import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversations, messages } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { aiService } from "@/lib/ai-service"
import { enviarMensagemWhatsApp } from "@/lib/zapi-service"

// Tipos para o webhook da Z-API
interface WebhookBody {
  instanceId?: string
  phone?: string
  message?: {
    text?: string
    body?: string
    type?: string
  }
  messageId?: string
  timestamp?: number
  event?: string
  data?: any
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

interface AIResponse {
  message: string
  action?: string
  data?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebhookBody

    console.log(`📨 [WEBHOOK] Recebido:`, JSON.stringify(body, null, 2))

    if (typeof body !== "object" || !body) {
      console.log(`❌ [WEBHOOK] Body inválido`)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    // Verificar se é uma mensagem recebida
    if (body.phone && (body.message?.text || body.message?.body)) {
      await handleIncomingMessage({
        phone: body.phone,
        message: body.message,
        messageId: body.messageId ?? "",
        timestamp: body.timestamp ?? Date.now(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("💥 [WEBHOOK] Erro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

async function handleIncomingMessage(messageData: {
  phone: string
  message: { text?: string; body?: string; type?: string }
  messageId: string
  timestamp: number
}): Promise<void> {
  try {
    const { phone, message, messageId, timestamp } = messageData

    console.log(`📱 [WEBHOOK] Processando mensagem de ${phone}:`, message.text || message.body)

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
          ultimaMensagem: new Date(),
        })
        .returning()
        .then((rows) => rows[0] ?? null)
    }

    if (!conversation) {
      throw new Error("Erro ao criar ou encontrar conversa!")
    }

    // Garantir tipo suportado
    const tipo: MessageTipo =
      message.type && ["texto", "imagem", "audio", "documento"].includes(message.type as string)
        ? (message.type as MessageTipo)
        : "texto"

    const conteudoMensagem = message.text ?? message.body ?? ""

    console.log(`💾 [WEBHOOK] Salvando mensagem do cliente na conversa ${conversation.id}`)

    // Salvar mensagem do cliente
    await db.insert(messages).values({
      conversationId: conversation.id,
      remetente: "cliente",
      conteudo: conteudoMensagem,
      tipo,
      metadata: { messageId, timestamp },
    })

    // Buscar histórico da conversa
    console.log(`🔍 [WEBHOOK] Buscando histórico da conversa ${conversation.id}`)

    const conversationHistory: DbMessage[] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt)
      .limit(20)

    console.log(`🧠 [WEBHOOK] Processando mensagem com IA. Histórico: ${conversationHistory.length} mensagens`)

    // Processar mensagem com IA
    const aiResponse: AIResponse = await aiService.processMessage(
      conteudoMensagem,
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

    // Enviar resposta via WhatsApp usando nosso novo serviço
    const sendResult = await enviarMensagemWhatsApp(telefoneClean, aiResponse.message)

    if (!sendResult.success) {
      console.error(`❌ [WEBHOOK] Erro ao enviar mensagem WhatsApp:`, sendResult.error)
    } else {
      console.log(`✅ [WEBHOOK] Mensagem WhatsApp enviada com sucesso`)
    }

    // Processar ações específicas se necessário
    if (aiResponse.action) {
      console.log(`🎬 [WEBHOOK] Processando ação: ${aiResponse.action}`)
      await handleAIAction(aiResponse.action, aiResponse.data, conversation.id, telefoneClean, conteudoMensagem)
    }

    // Atualizar última mensagem da conversa
    await db.update(conversations).set({ ultimaMensagem: new Date() }).where(eq(conversations.id, conversation.id))

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
      case "agendar":
        await processAgendamento(data, conversationId, phone, userMessage)
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

async function processAgendamento(
  data: unknown,
  conversationId: string,
  phone: string,
  userMessage: string,
): Promise<void> {
  try {
    console.log(`📅 [WEBHOOK-AGENDAMENTO] Processando agendamento:`, data)

    // Verificar se é confirmação de agendamento
    if (userMessage.toLowerCase().includes("sim") || userMessage.toLowerCase().includes("confirmo")) {
      // Buscar dados do agendamento na conversa (implementar lógica de estado)
      if (data && typeof data === "object" && "nome" in data && "servico" in data) {
        const dadosAgendamento = data as any

        console.log(`📝 [WEBHOOK-AGENDAMENTO] Criando agendamento com IA:`, dadosAgendamento)

        const resultado = await aiService.criarAgendamentoIA({
          telefone: phone,
          nome: dadosAgendamento.nome,
          servico: dadosAgendamento.servico,
          data: dadosAgendamento.data,
          horario: dadosAgendamento.horario,
        })

        console.log(`💾 [WEBHOOK-AGENDAMENTO] Salvando resposta no banco:`, resultado.message.substring(0, 50))

        // Salvar resposta no banco
        await db.insert(messages).values({
          conversationId,
          remetente: "bot",
          conteudo: resultado.message,
          tipo: "texto",
        })

        console.log(`📤 [WEBHOOK-AGENDAMENTO] Enviando confirmação via WhatsApp`)

        // Enviar resposta
        const sendResult = await enviarMensagemWhatsApp(phone, resultado.message)

        if (!sendResult.success) {
          console.error(`❌ [WEBHOOK-AGENDAMENTO] Erro ao enviar confirmação:`, sendResult.error)
        } else {
          console.log(`✅ [WEBHOOK-AGENDAMENTO] Confirmação enviada com sucesso`)
        }
      } else {
        console.log(`❌ [WEBHOOK-AGENDAMENTO] Dados de agendamento inválidos:`, data)
      }
    } else {
      console.log(`⏳ [WEBHOOK-AGENDAMENTO] Aguardando confirmação do usuário`)
    }
  } catch (error) {
    console.error("💥 [WEBHOOK-AGENDAMENTO] Erro ao processar agendamento:", error)

    // Enviar mensagem de erro
    await enviarMensagemWhatsApp(
      phone,
      "❌ Erro ao processar agendamento. Tente novamente ou entre em contato conosco.",
    )
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
