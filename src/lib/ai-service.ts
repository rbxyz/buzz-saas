import { generateText, type CoreMessage } from "ai"
import { groq } from "@ai-sdk/groq"
import dayjs from "dayjs"
import {
  listarServicosDisponiveis,
  listarHorariosDisponiveis,
  criarAgendamento,
  criarCliente,
} from "@/lib/actions"
import { db } from "@/server/db"
import { servicos, intervalosTrabalho } from "@/server/db/schema"
import { eq } from "drizzle-orm"

const model = groq("llama-3.1-8b-instant")

interface AIResponse {
  message: string
}

type ConversationMessage = CoreMessage

const today = new Date().toLocaleDateString("sv-SE", {
  timeZone: "America/Sao_Paulo",
})

interface IntentionResult {
  intention: 'listar_servicos' | 'listar_horarios' | 'agendar' | 'conversa_geral'
  params: {
    nomeServico?: string
    preco?: number
    data?: string
    horario?: string
    nomeCliente?: string
  }
  confidence: number
}

interface ConversationContext {
  lastServiceMentioned?: string
  lastPriceMentioned?: number
  waitingForHorarios?: boolean
  waitingForAgendamento?: boolean
  lastBotMessage?: string
}

class AIService {
  private async getBusinessContext() {
    const servicosDisponiveis = await db
      .select({
        nome: servicos.nome,
        descricao: servicos.descricao,
        preco: servicos.preco,
        duracao: servicos.duracao,
      })
      .from(servicos)
      .where(eq(servicos.ativo, true))

    const horariosTrabalho = await db
      .select()
      .from(intervalosTrabalho)
      .where(eq(intervalosTrabalho.ativo, true))

    return { servicos: servicosDisponiveis, horarios: horariosTrabalho }
  }

  private extractConversationContext(history: ConversationMessage[]): ConversationContext {
    const context: ConversationContext = {}

    // Pegar as últimas 4 mensagens para analisar contexto
    const recentMessages = history.slice(-4)

    for (const msg of recentMessages) {
      if (msg.role === 'assistant' && typeof msg.content === 'string') {
        context.lastBotMessage = msg.content

        // Verificar se bot perguntou sobre horários
        if (msg.content.includes('horários disponíveis') ||
          msg.content.includes('saber mais sobre os horários') ||
          msg.content.includes('gostaria de saber os horários')) {
          context.waitingForHorarios = true
        }

        // Verificar se bot perguntou sobre agendamento
        if (msg.content.includes('agendar') || msg.content.includes('marcar')) {
          context.waitingForAgendamento = true
        }
      }

      if (msg.role === 'user' && typeof msg.content === 'string') {
        const content = msg.content.toLowerCase()

        // Extrair serviços mencionados (case insensitive)
        if (content.includes('corte')) {
          context.lastServiceMentioned = 'Corte de cabelo'
        } else if (content.includes('barba')) {
          context.lastServiceMentioned = 'Barba'
        } else if (content.includes('sobrancelha')) {
          context.lastServiceMentioned = 'Sobrancelha'
        }

        // Extrair preços mencionados
        if (content.includes('30') || content.includes('trinta')) {
          context.lastPriceMentioned = 30
        } else if (content.includes('50') || content.includes('cinquenta')) {
          context.lastPriceMentioned = 50
        } else if (content.includes('15') || content.includes('quinze')) {
          context.lastPriceMentioned = 15
        } else if (content.includes('25') || content.includes('vinte')) {
          context.lastPriceMentioned = 25
        }
      }
    }

    return context
  }

  private detectIntention(userMessage: string, context: ConversationContext): IntentionResult {
    const message = userMessage.toLowerCase().trim()

    // Respostas de confirmação com contexto
    if ((message === 'sim' || message === 'ok' || message === 'pode ser' ||
      message === 'quero' || message === 'yes') && context.waitingForHorarios) {
      return {
        intention: 'listar_horarios',
        params: {
          nomeServico: context.lastServiceMentioned,
          preco: context.lastPriceMentioned
        },
        confidence: 0.9
      }
    }

    // Detecção direta de intenções
    if (message.includes('serviço') || message.includes('servico') ||
      (message.includes('quais') && (message.includes('tem') || message.includes('oferece')) && !message.includes('horário') && !message.includes('horario'))) {
      return { intention: 'listar_servicos', params: {}, confidence: 0.8 }
    }

    // Detecção de horários (prioridade alta)
    if (message.includes('horário') || message.includes('horario') ||
      message.includes('disponível') || message.includes('disponivel') ||
      message.includes('livre') || message.includes('vago') ||
      message.includes('que horas') || message.includes('quando') ||
      (message.includes('quais') && message.includes('tem') && (message.includes('disponível') || message.includes('amanhã') || message.includes('hoje')))) {

      const params: any = {}

      // Extrair serviço mencionado na mensagem atual ou do contexto
      if (message.includes('corte')) {
        params.nomeServico = 'Corte de cabelo'
      } else if (message.includes('barba')) {
        params.nomeServico = 'Barba'
      } else if (message.includes('sobrancelha')) {
        params.nomeServico = 'Sobrancelha'
      } else if (context.lastServiceMentioned) {
        params.nomeServico = context.lastServiceMentioned
      }

      // Extrair preço
      if (message.includes('30') || message.includes('trinta')) {
        params.preco = 30
      } else if (message.includes('50') || message.includes('cinquenta')) {
        params.preco = 50
      } else if (context.lastPriceMentioned) {
        params.preco = context.lastPriceMentioned
      }

      // Extrair data
      if (message.includes('amanhã') || message.includes('amanha')) {
        params.data = dayjs().add(1, 'day').format('YYYY-MM-DD')
      } else if (message.includes('hoje')) {
        params.data = today
      } else {
        params.data = dayjs().add(1, 'day').format('YYYY-MM-DD') // Default para amanhã
      }

      return { intention: 'listar_horarios', params, confidence: 0.9 }
    }

    // Detecção de agendamento
    if (message.includes('agendar') || message.includes('marcar') ||
      message.includes('reservar') || message.includes('confirmar') ||
      message.includes('quero marcar') || message.includes('vou agendar')) {
      return { intention: 'agendar', params: {}, confidence: 0.8 }
    }

    // Se mencionou apenas um serviço, provavelmente quer informações sobre ele
    if (message === 'corte' || message === 'barba' || message === 'sobrancelha') {
      return {
        intention: 'conversa_geral',
        params: { nomeServico: message === 'corte' ? 'Corte de cabelo' : message.charAt(0).toUpperCase() + message.slice(1) },
        confidence: 0.7
      }
    }

    return { intention: 'conversa_geral', params: {}, confidence: 0.5 }
  }

  private async handleListarServicos(): Promise<string> {
    try {
      const servicos = await listarServicosDisponiveis()
      return `Aqui estão nossos serviços disponíveis: ✨\n\n${servicos}\n\nQual serviço te interessa?`
    } catch (error) {
      return "Desculpe, houve um erro ao buscar os serviços. Tente novamente."
    }
  }

  private async handleListarHorarios(params: any): Promise<string> {
    try {
      const { nomeServico, preco, data } = params

      if (!nomeServico) {
        return "Para ver os horários, preciso saber qual serviço você deseja. Temos:\n• Corte de cabelo (R$30 ou R$50)\n• Barba (R$15)\n• Sobrancelha (R$25)\n\nQual serviço você gostaria? 💇‍♀️"
      }

      const dataFinal = data || dayjs().add(1, 'day').format('YYYY-MM-DD')
      const resultado = await listarHorariosDisponiveis(nomeServico, dataFinal, preco)

      return `${resultado} ⏰\n\nGostaria de agendar algum desses horários?`
    } catch (error) {
      console.error('Erro ao listar horários:', error)
      return "Desculpe, houve um erro ao buscar os horários. Tente novamente."
    }
  }

  private async handleConversa(userMessage: string, context: any, conversationContext: ConversationContext): Promise<string> {
    const servicosText = context.servicos.length > 0
      ? context.servicos.map((s: any) => `- ${s.nome}: R$${s.preco} (${s.duracao} min)`).join('\n')
      : "Nenhum serviço cadastrado."

    // Se mencionou um serviço específico, dar informações sobre ele
    if (conversationContext.lastServiceMentioned || userMessage.toLowerCase().includes('barba') ||
      userMessage.toLowerCase().includes('corte') || userMessage.toLowerCase().includes('sobrancelha')) {

      const servicoMencionado = conversationContext.lastServiceMentioned ||
        (userMessage.toLowerCase().includes('barba') ? 'Barba' :
          userMessage.toLowerCase().includes('corte') ? 'Corte de cabelo' : 'Sobrancelha')

      const servicoInfo = context.servicos.find((s: any) =>
        s.nome.toLowerCase().includes(servicoMencionado.toLowerCase())
      )

      if (servicoInfo) {
        return `Perfeito! O serviço de ${servicoInfo.nome} custa R$${servicoInfo.preco} e tem duração de ${servicoInfo.duracao} minutos. 💇‍♀️\n\nVocê gostaria de saber os horários disponíveis para esse serviço? 🕒`
      }
    }

    const prompt = `Você é um assistente de agendamento. Seja cordial e prestativo. Use emojis.
    
SERVIÇOS DISPONÍVEIS:
${servicosText}

INSTRUÇÕES:
- Se o cliente perguntar sobre serviços, mostre a lista acima
- Se perguntar sobre horários, peça para ele especificar o serviço e o preço
- Se quiser agendar, colete: serviço (com preço), data e horário
- Seja sempre educado e helpful
- Use respostas curtas e diretas

Mensagem do cliente: "${userMessage}"

Responda de forma natural e útil:`

    try {
      const { text } = await generateText({
        model: model,
        messages: [{ role: "user", content: prompt }],
      })

      return text || "Como posso ajudar você hoje? 😊"
    } catch (error) {
      return "Olá! Como posso ajudar você hoje? 😊"
    }
  }

  async processMessage(
    userMessage: string,
    phoneNumber: string,
    conversationHistory: ConversationMessage[] = [],
  ): Promise<AIResponse> {
    try {
      console.log(`🤖 [AI] Processando: "${userMessage}" para ${phoneNumber}`)

      const context = await this.getBusinessContext()
      const conversationContext = this.extractConversationContext(conversationHistory)
      const intention = this.detectIntention(userMessage, conversationContext)

      console.log(`🎯 [AI] Intenção detectada: ${intention.intention} (confiança: ${intention.confidence})`, intention.params)
      console.log(`📝 [AI] Contexto da conversa:`, conversationContext)

      let response: string

      switch (intention.intention) {
        case 'listar_servicos':
          response = await this.handleListarServicos()
          break
        case 'listar_horarios':
          response = await this.handleListarHorarios(intention.params)
          break
        case 'agendar':
          response = "Para agendar, preciso de algumas informações:\n• Qual serviço? (corte R$30/R$50, barba R$15, sobrancelha R$25)\n• Para qual data?\n• Qual horário preferido? 📅"
          break
        default:
          response = await this.handleConversa(userMessage, context, conversationContext)
      }

      console.log(`✅ [AI] Resposta gerada para intenção ${intention.intention}`)
      return { message: response }
    } catch (error) {
      console.error("💥 [AI] Erro fatal no processamento:", error)
      return {
        message: "Olá! Como posso ajudar você hoje? 😊",
      }
    }
  }
}

export const aiService = new AIService()
