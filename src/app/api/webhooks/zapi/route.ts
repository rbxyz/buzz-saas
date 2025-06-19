import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversations, messages, clientes } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { aiService } from "@/lib/ai-service"
import { enviarMensagemWhatsApp } from "@/lib/zapi-service"
import { withDrizzleRetry } from "@/lib/database-retry"

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

interface Conversation {
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

interface DbMessage {
  id: number
  conversationId: number
  content: string
  role: "user" | "assistant" | "system" | "bot"
  timestamp: Date
  messageId?: string | null
  createdAt: Date
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
    const phone = body.phone ?? ""
    const messageText = body.text?.message ?? body.body ?? ""
    const messageId = body.messageId ?? ""
    const timestamp = body.momment ?? Date.now()
    const senderName = body.senderName ?? ""

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
    }).catch((err) => {
      // Apenas logamos o erro, a resposta principal já foi enviada
      console.error("💥 [WEBHOOK] Erro no processamento assíncrono:", err)
    })

    // Responder imediatamente para evitar timeout
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("💥 [WEBHOOK] Erro principal:", e)
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: "Erro interno do servidor", message }, { status: 500 })
  }
}

async function processIncomingMessage(data: {
  phone: string
  message: string
  messageId: string
  timestamp: number
  senderName?: string
}): Promise<void> {
  console.log(`[PROCESS_START] Iniciando processamento para ${data.phone}.`)
  try {
    const { phone, message, messageId, timestamp, senderName } = data

    console.log(`📱 [WEBHOOK] Processando mensagem de ${phone}:`, message)

    // Adicionar no início da função processIncomingMessage, após os logs
    // Por enquanto, usar userId = 1 (primeiro usuário).
    // TODO: Implementar lógica para identificar o usuário correto baseado na instância Z-API
    const userId = 1 // Temporário - usar o primeiro usuário
    console.log(`👤 [DEBUG] userId definido como: ${userId}`)

    // Limpar telefone (remover caracteres especiais)
    const telefoneClean = phone.replace(/\D/g, "")
    console.log(`📞 [DEBUG] Telefone limpo: ${telefoneClean}`)

    console.log(`🔍 [DEBUG] Tentando buscar conversa existente...`)
    // Buscar ou criar conversa com retry
    let conversation: Conversation | null = null
    try {
      conversation = await withDrizzleRetry(
        () => db
          .select()
          .from(conversations)
          .where(eq(conversations.telefone, telefoneClean))
          .limit(1)
          .then((rows) => rows[0] ?? null),
        `Buscar conversa para ${telefoneClean}`
      )
      console.log(`✅ [DEBUG] Busca de conversa concluída. Resultado:`, conversation ? `Conversa encontrada (ID: ${conversation.id})` : 'Nenhuma conversa encontrada')
    } catch (error) {
      console.error(`❌ [DEBUG] ERRO ao buscar conversa:`, error)
      throw error
    }

    if (!conversation) {
      console.log(`🆕 [DEBUG] Criando nova conversa para ${telefoneClean}`)
      try {
        conversation = await withDrizzleRetry(
          () => db
            .insert(conversations)
            .values({
              userId: userId,
              telefone: telefoneClean,
              ativa: true,
              ultimaMensagem: null,
            })
            .returning()
            .then((rows) => rows[0] ?? null),
          `Criar conversa para ${telefoneClean}`
        )
        console.log(`✅ [DEBUG] Nova conversa criada:`, conversation ? `ID: ${conversation.id}` : 'FALHA')
      } catch (error) {
        console.error(`❌ [DEBUG] ERRO ao criar conversa:`, error)
        throw error
      }
    }

    if (!conversation) {
      throw new Error("ERRO CRÍTICO: Não foi possível criar ou encontrar conversa!")
    }

    console.log(`🔍 [DEBUG] Tentando buscar cliente pelo telefone...`)
    // Buscar cliente pelo telefone com retry
    let cliente: { id: number; nome: string; telefone: string } | null = null
    try {
      const clienteResult = await withDrizzleRetry(
        () => db
          .select()
          .from(clientes)
          .where(eq(clientes.telefone, telefoneClean))
          .limit(1)
          .then((rows) => rows[0] ?? null),
        `Buscar cliente ${telefoneClean}`
      )
      cliente = clienteResult as { id: number; nome: string; telefone: string } | null
      console.log(`✅ [DEBUG] Busca de cliente concluída:`, cliente ? `Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})` : 'Nenhum cliente encontrado')
    } catch (error) {
      console.error(`❌ [DEBUG] ERRO ao buscar cliente:`, error)
      throw error
    }

    // Se temos o nome do remetente e não temos cliente, criar um novo cliente
    if (!cliente && senderName && senderName.trim() !== "") {
      console.log(`🆕 [DEBUG] Criando novo cliente com nome do WhatsApp: ${senderName}`)
      try {
        const novoClienteResult = await withDrizzleRetry(
          () => db
            .insert(clientes)
            .values({
              userId: userId,
              nome: senderName,
              telefone: telefoneClean,
            })
            .returning()
            .then((rows) => rows[0] ?? null),
          `Criar cliente ${senderName}`
        )
        cliente = novoClienteResult as { id: number; nome: string; telefone: string } | null
        console.log(`✅ [DEBUG] Cliente criado:`, cliente ? `${cliente.nome} (ID: ${cliente.id})` : 'FALHA')

        // Atualizar a conversa com o ID do cliente
        if (cliente) {
          try {
            await withDrizzleRetry(
              () => db.update(conversations).set({ clienteId: cliente!.id }).where(eq(conversations.id, conversation.id)),
              `Vincular cliente ${cliente.id} à conversa`
            )
            console.log(`✅ [DEBUG] Cliente vinculado à conversa com sucesso`)
          } catch (error) {
            console.error(`❌ [DEBUG] ERRO ao vincular cliente à conversa:`, error)
            throw error
          }
        }
      } catch (error) {
        console.error(`❌ [DEBUG] ERRO ao criar cliente:`, error)
        throw error
      }
    }

    console.log(`💾 [DEBUG] Tentando salvar mensagem do usuário...`)
    // Salvar mensagem do cliente com retry
    try {
      await withDrizzleRetry(
        () => db.insert(messages).values({
          conversationId: conversation.id,
          content: message,
          role: "user", // Usar "user" em vez de "cliente"
          timestamp: new Date(timestamp),
          messageId: messageId,
        }),
        `Salvar mensagem do usuário`
      )
      console.log(`✅ [DEBUG] Mensagem do usuário salva com sucesso`)
    } catch (error) {
      console.error(`❌ [DEBUG] ERRO ao salvar mensagem do usuário:`, error)
      throw error
    }

    console.log(`🗣️ [DEBUG] Tentando buscar histórico da conversa...`)
    // Buscar histórico da conversa com retry
    let conversationHistory: DbMessage[] = []
    try {
      conversationHistory = await withDrizzleRetry(
        () => db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(messages.createdAt)
          .limit(20),
        `Buscar histórico da conversa ${conversation.id}`
      )
      console.log(`✅ [DEBUG] Histórico da conversa obtido: ${conversationHistory.length} mensagens`)
    } catch (error) {
      console.error(`❌ [DEBUG] ERRO ao buscar histórico:`, error)
      throw error
    }

    console.log(`🤖 [DEBUG] Tentando chamar o serviço de IA...`)
    // Chamar a IA para obter uma resposta
    let aiResponse
    try {
      aiResponse = await aiService.processMessage(
        message,
        telefoneClean,
        conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      )
      console.log(`✅ [DEBUG] Resposta da IA recebida:`, aiResponse)
    } catch (error) {
      console.error(`❌ [DEBUG] ERRO no serviço de IA:`, error)
      throw error
    }

    console.log(`💾 [DEBUG] Tentando salvar e enviar resposta da IA...`)
    // Salvar e enviar a resposta da IA
    if (aiResponse.message) {
      try {
        await withDrizzleRetry(
          () =>
            db.insert(messages).values({
              conversationId: conversation.id,
              content: aiResponse.message,
              role: "assistant",
              timestamp: new Date(),
            }),
          `Salvar resposta da IA`,
        )
        console.log(`✅ [DEBUG] Resposta da IA salva no banco`)
      } catch (error) {
        console.error(`❌ [DEBUG] ERRO ao salvar resposta da IA:`, error)
        throw error
      }

      console.log(`📤 [DEBUG] Tentando enviar mensagem via WhatsApp...`)
      try {
        await enviarMensagemWhatsApp(phone, aiResponse.message)
        console.log(`✅ [DEBUG] Mensagem enviada via WhatsApp com sucesso`)
      } catch (error) {
        console.error(`❌ [DEBUG] ERRO ao enviar mensagem via WhatsApp:`, error)
        throw error
      }
    }

    // Processar ação se houver
    if (aiResponse.action) {
      console.log(`🛠️ [DEBUG] Tentando processar ação da IA: ${aiResponse.action}`)
      try {
        await handleAIAction(aiResponse.action, aiResponse.data, conversation.id, phone, message)
        console.log(`✅ [DEBUG] Ação da IA processada com sucesso`)
      } catch (error) {
        console.error(`❌ [DEBUG] ERRO ao processar ação da IA:`, error)
        throw error
      }
    }

    console.log(`🔄 [DEBUG] Tentando atualizar última interação...`)
    // Atualizar a conversa com a última interação
    try {
      await withDrizzleRetry(
        () =>
          db.update(conversations)
            .set({ ultimaInteracao: new Date() })
            .where(eq(conversations.id, conversation.id)),
        `Atualizar última interação da conversa ${conversation.id}`,
      )
      console.log(`✅ [DEBUG] Última interação atualizada com sucesso`)
    } catch (error) {
      console.error(`❌ [DEBUG] ERRO ao atualizar última interação:`, error)
      throw error
    }

    console.log(`[PROCESS_END] ✅ Processamento concluído com SUCESSO para ${phone}.`)
  } catch (error) {
    console.error(`💥 [PROCESS_ERROR] ERRO CAPTURADO no processamento para ${data.phone}:`)
    console.error(`💥 [PROCESS_ERROR] Tipo do erro:`, typeof error)
    console.error(`💥 [PROCESS_ERROR] Erro completo:`, error)
    console.error(`💥 [PROCESS_ERROR] Stack trace:`, error instanceof Error ? error.stack : 'N/A')

    // Tentar enviar uma mensagem de erro para o usuário
    try {
      await enviarMensagemWhatsApp(data.phone, "Ops! Algo deu errado do nosso lado. Já estamos verificando o problema. Tente novamente em alguns minutos.")
    } catch (sendError) {
      console.error(`💥 [PROCESS_ERROR] Falha ao enviar mensagem de erro:`, sendError)
    }
  }
}

async function handleAIAction(
  action: string,
  data: unknown,
  conversationId: number, // Alterado para number
  phone: string,
  _userMessage: string,
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
  } catch (e) {
    console.error(`💥 [ACTION] Erro ao executar ação ${action}:`, e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    await enviarMensagemWhatsApp(phone, `Ocorreu um erro ao processar sua solicitação: ${errorMessage}`)
  }
}

async function processCancelamento(data: unknown, conversationId: number, phone: string): Promise<void> {
  console.log("🔄 [WEBHOOK-CANCELAMENTO] Processando cancelamento:", data)

  await enviarMensagemWhatsApp(
    phone,
    "Para cancelar um agendamento, entre em contato conosco diretamente. Em breve teremos essa funcionalidade automatizada! 📞",
  )
}

async function processReagendamento(data: unknown, conversationId: number, phone: string): Promise<void> {
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
