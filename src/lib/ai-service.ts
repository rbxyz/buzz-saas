import { groq } from "@ai-sdk/groq"
import { generateText, streamText } from "ai"
import { db } from "@/server/db"
import { configuracoes, clientes, agendamentos, intervalosTrabalho } from "@/server/db/schema"
import { eq, desc } from "drizzle-orm"

interface AgendamentoContext {
  servicos: Array<{
    nome: string
    preco: number
    duracaoMinutos: number
  }>
  horariosDisponiveis: string[]
  configuracao: any
}

interface AIResponse {
  message: string
  action?: "agendar" | "listar_servicos" | "listar_horarios" | "cancelar" | "reagendar"
  data?: any
}

export class AIService {
  private model = groq("llama-3.1-8b-instant")

  async processMessage(
    message: string,
    telefone: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<AIResponse> {
    try {
      // Buscar contexto do negócio
      const context = await this.getBusinessContext()

      // Buscar cliente pelo telefone
      const cliente = await this.getClienteByTelefone(telefone)

      // Criar prompt do sistema
      const systemPrompt = this.createSystemPrompt(context, cliente)

      // Preparar mensagens para a IA
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ]

      // Gerar resposta da IA
      const result = await generateText({
        model: this.model,
        messages,
        temperature: 0.7,
        maxTokens: 500,
      })

      // Analisar a resposta para identificar ações
      const aiResponse = this.parseAIResponse(result.text, message)

      return aiResponse
    } catch (error) {
      console.error("Erro no processamento da IA:", error)
      return {
        message: "Desculpe, ocorreu um erro. Tente novamente em alguns instantes.",
      }
    }
  }

  private async getBusinessContext(): Promise<AgendamentoContext> {
    try {
      // Buscar configurações do negócio
      const config = await db
        .select()
        .from(configuracoes)
        .limit(1)
        .then((rows) => rows[0])

      if (!config) {
        throw new Error("Configurações não encontradas")
      }

      // Buscar horários disponíveis
      const horariosDisponiveis = await this.getHorariosDisponiveis()

      return {
        servicos: (config.servicos as any[]) || [],
        horariosDisponiveis,
        configuracao: config,
      }
    } catch (error) {
      console.error("Erro ao buscar contexto:", error)
      return {
        servicos: [],
        horariosDisponiveis: [],
        configuracao: null,
      }
    }
  }

  private async getClienteByTelefone(telefone: string) {
    try {
      const cliente = await db
        .select()
        .from(clientes)
        .where(eq(clientes.telefone, telefone))
        .limit(1)
        .then((rows) => rows[0] || null)

      return cliente
    } catch (error) {
      console.error("Erro ao buscar cliente:", error)
      return null
    }
  }

  private async getHorariosDisponiveis(): Promise<string[]> {
    try {
      // Buscar intervalos de trabalho ativos
      const intervalos = await db.select().from(intervalosTrabalho).where(eq(intervalosTrabalho.ativo, true))

      // Gerar horários disponíveis baseado nos intervalos
      const horarios: string[] = []

      intervalos.forEach((intervalo) => {
        const inicio = this.parseTime(intervalo.horaInicio)
        const fim = this.parseTime(intervalo.horaFim)

        for (let hora = inicio; hora < fim; hora += 30) {
          // Intervalos de 30 minutos
          const horaFormatada = this.formatTime(hora)
          horarios.push(`${intervalo.diaSemana} ${horaFormatada}`)
        }
      })

      return horarios
    } catch (error) {
      console.error("Erro ao buscar horários:", error)
      return []
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(":").map(Number)
    return hours * 60 + minutes
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  private createSystemPrompt(context: AgendamentoContext, cliente: any): string {
    const { servicos, configuracao } = context

    return `Você é um assistente virtual especializado em agendamentos para ${configuracao?.nome || "nossa empresa"}.

INFORMAÇÕES DO NEGÓCIO:
- Nome: ${configuracao?.nome || "Empresa"}
- Telefone: ${configuracao?.telefone || "Não informado"}
- Endereço: ${configuracao?.endereco || "Não informado"}

SERVIÇOS DISPONÍVEIS:
${servicos.map((s) => `- ${s.nome}: R$ ${s.preco} (${s.duracaoMinutos} min)`).join("\n")}

HORÁRIOS DE FUNCIONAMENTO:
- Dias: ${configuracao?.dias?.join(", ") || "Segunda a Sexta"}
- Horário: ${configuracao?.horaInicio || "09:00"} às ${configuracao?.horaFim || "18:00"}

${cliente ? `CLIENTE IDENTIFICADO: ${cliente.nome}` : "CLIENTE NÃO CADASTRADO"}

INSTRUÇÕES:
1. Seja cordial e profissional
2. Ajude com agendamentos, informações sobre serviços e horários
3. Para agendamentos, colete: serviço desejado, data e horário preferido
4. Confirme todos os dados antes de finalizar
5. Se o cliente não estiver cadastrado, colete nome e email
6. Use linguagem natural e amigável
7. Sempre confirme disponibilidade antes de agendar

AÇÕES DISPONÍVEIS:
- agendar: Para criar um novo agendamento
- listar_servicos: Para mostrar serviços disponíveis
- listar_horarios: Para mostrar horários disponíveis
- cancelar: Para cancelar agendamento
- reagendar: Para alterar agendamento existente

Responda de forma natural e útil, sempre focando em ajudar o cliente.`
  }

  private parseAIResponse(aiText: string, userMessage: string): AIResponse {
    const lowerMessage = userMessage.toLowerCase()
    const lowerAI = aiText.toLowerCase()

    // Detectar intenções baseadas na mensagem do usuário e resposta da IA
    let action: AIResponse["action"] = undefined
    const data: any = undefined

    if (lowerMessage.includes("agendar") || lowerMessage.includes("marcar") || lowerAI.includes("agendar")) {
      action = "agendar"
    } else if (lowerMessage.includes("serviços") || lowerMessage.includes("servicos") || lowerAI.includes("serviços")) {
      action = "listar_servicos"
    } else if (lowerMessage.includes("horários") || lowerMessage.includes("horarios") || lowerAI.includes("horários")) {
      action = "listar_horarios"
    } else if (lowerMessage.includes("cancelar") || lowerAI.includes("cancelar")) {
      action = "cancelar"
    } else if (
      lowerMessage.includes("reagendar") ||
      lowerMessage.includes("remarcar") ||
      lowerAI.includes("reagendar")
    ) {
      action = "reagendar"
    }

    return {
      message: aiText,
      action,
      data,
    }
  }

  async createAgendamento(dados: {
    clienteId: string
    servico: string
    dataHora: Date
    duracaoMinutos: number
  }) {
    try {
      const agendamento = await db
        .insert(agendamentos)
        .values({
          clienteId: dados.clienteId,
          servico: dados.servico,
          dataHora: dados.dataHora,
          duracaoMinutos: dados.duracaoMinutos,
          status: "agendado",
        })
        .returning()
        .then((rows) => rows[0])

      return {
        success: true,
        agendamento,
      }
    } catch (error) {
      console.error("Erro ao criar agendamento:", error)
      return {
        success: false,
        error: "Erro ao criar agendamento",
      }
    }
  }

  async getAgendamentosCliente(clienteId: string) {
    try {
      const agendamentosCliente = await db
        .select()
        .from(agendamentos)
        .where(eq(agendamentos.clienteId, clienteId))
        .orderBy(desc(agendamentos.dataHora))

      return agendamentosCliente
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error)
      return []
    }
  }

  // Método para streaming de respostas (útil para respostas longas)
  async streamResponse(
    message: string,
    telefone: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ) {
    try {
      const context = await this.getBusinessContext()
      const cliente = await this.getClienteByTelefone(telefone)
      const systemPrompt = this.createSystemPrompt(context, cliente)

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ]

      return streamText({
        model: this.model,
        messages,
        temperature: 0.7,
        maxTokens: 500,
      })
    } catch (error) {
      console.error("Erro no streaming da IA:", error)
      throw error
    }
  }
}

// Instância singleton do serviço
export const aiService = new AIService()
