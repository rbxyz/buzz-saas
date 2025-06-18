import { groq } from "@ai-sdk/groq"
import { generateText, type CoreMessage } from "ai"
import { db } from "@/server/db"
import { conversations, messages } from "@/server/db/schema"
import type { clientes, agendamentos, configuracoes } from "@/server/db/schema"
import { eq, desc } from "drizzle-orm"
import dayjs from "dayjs"
import "dayjs/locale/pt-br"
import type { InferSelectModel } from "drizzle-orm"

dayjs.locale("pt-br")

type Clientes = InferSelectModel<typeof clientes>
type Agendamentos = InferSelectModel<typeof agendamentos>
type Configuracoes = InferSelectModel<typeof configuracoes>

interface ServicoConfigurado {
  nome: string
  preco: number
  duracaoMinutos: number
}

interface AgendamentoContext {
  servicos: ServicoConfigurado[]
  configuracao: Configuracoes | null
  cliente?: Clientes
  agendamentos?: Agendamentos[]
  conversationHistory: Array<{ role: string; content: string }>
  // Novo: contexto de agendamento em andamento
  agendamentoEmAndamento?: {
    servico?: string
    data?: string
    horario?: string
  }
}

interface AIResponse {
  message: string
  action?:
  | "agendar_direto"
  | "verificar_horario"
  | "listar_servicos"
  | "listar_horarios"
  | "cancelar"
  | "reagendar"
  | "consultar_agendamentos"
  | "criar_cliente"
  data?: unknown
}

interface DadosAgendamentoExtraidos {
  nome?: string
  servico?: string
  data?: string
  horario?: string
  completo?: boolean
}

export class AIService {
  private model = groq("llama-3.1-8b-instant")
  private baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Armazenar contexto de agendamento entre mensagens
  private agendamentoContexto: Record<
    string,
    {
      servico?: string
      data?: string
      horario?: string
      ultimaAtualizacao: Date
    }
  > = {}

  // Rastrear se já foi feita a saudação inicial para cada telefone
  private saudacoesFeitas = new Set<string>()

  async processMessage(
    message: string,
    telefone: string,
    conversationHistory: Array<{ role: string; content?: string }> = [],
  ): Promise<AIResponse> {
    try {
      console.log(`🧠 [AI-SERVICE] Processando mensagem: "${message}"`)
      console.log(`📱 [AI-SERVICE] Telefone do cliente: ${telefone}`)

      // Verificar se é a primeira mensagem desta conversa
      const isPrimeiraMensagem = this.isPrimeiraMensagemDaConversa(telefone, conversationHistory)
      console.log(`👋 [AI-SERVICE] É primeira mensagem? ${isPrimeiraMensagem}`)

      // Buscar contexto completo via webhooks
      const context = await this.getBusinessContext(telefone)

      if (!context) {
        return {
          message: "Desculpe, não consegui carregar as informações da barbearia. Tente novamente mais tarde.",
        }
      }

      // Adicionar contexto de agendamento em andamento
      const contextoAtual = this.agendamentoContexto[telefone]
      if (contextoAtual) {
        // Verificar se o contexto não está expirado (30 minutos)
        const agora = new Date()
        const ultimaAtualizacao = contextoAtual.ultimaAtualizacao
        const diferencaMinutos = (agora.getTime() - ultimaAtualizacao.getTime()) / (1000 * 60)

        if (diferencaMinutos < 30) {
          context.agendamentoEmAndamento = contextoAtual
          console.log(`🔄 [AI-SERVICE] Recuperando contexto de agendamento:`, context.agendamentoEmAndamento)
        } else {
          // Contexto expirado
          delete this.agendamentoContexto[telefone]
        }
      }

      // Se é primeira mensagem, personalizar saudação
      if (isPrimeiraMensagem) {
        const saudacaoPersonalizada = await this.criarSaudacaoPersonalizada(context.cliente, message)
        if (saudacaoPersonalizada) {
          console.log(`👋 [AI-SERVICE] Enviando saudação personalizada`)
          // Marcar que a saudação foi feita
          this.saudacoesFeitas.add(telefone)
          return { message: saudacaoPersonalizada }
        }
      }

      if (context.cliente) {
        console.log(`👤 [AI-SERVICE] Cliente encontrado: ${context.cliente.nome} (ID: ${context.cliente.id})`)
      } else {
        console.log(`🆕 [AI-SERVICE] Cliente não encontrado para o telefone ${telefone}`)
      }

      console.log(`📊 [AI-SERVICE] Serviços carregados: ${context.servicos.length}`)
      console.log(`📊 [AI-SERVICE] Histórico: ${context.conversationHistory.length} mensagens`)

      // Criar prompt do sistema personalizado
      const systemPrompt = this.createPersonalizedSystemPrompt(context)

      // CORREÇÃO: Filtrar mensagens inválidas e garantir que todas têm content
      const validHistory = context.conversationHistory
        .filter((msg) => msg.content?.trim())
        .slice(-10)
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content ?? "", // Garantir que content nunca é undefined
        }))

      console.log(`🧹 [AI-SERVICE] Mensagens válidas para o histórico: ${validHistory.length}`)

      // Preparar mensagens para a IA
      const messagesForAI: CoreMessage[] = [{ role: "system", content: systemPrompt }, ...validHistory, { role: "user", content: message }]

      console.log(`🤖 [AI-SERVICE] Enviando para IA: ${messagesForAI.length} mensagens`)

      // Gerar resposta da IA
      const result = await generateText({
        model: this.model,
        messages: messagesForAI,
        temperature: 0.9,
        maxTokens: 1200,
      })

      console.log(`✅ [AI-SERVICE] Resposta recebida (${result.text.length} chars)`)

      // Analisar e processar a resposta
      const aiResponse = await this.parseAndProcessResponse(result.text, message, telefone, context)

      return aiResponse
    } catch (error) {
      console.error("💥 [AI-SERVICE] Erro no processamento da IA:", error)
      return {
        message:
          "Oi! Desculpa, tive um probleminha aqui. 😅 Pode repetir o que você precisa? Estou aqui pra te ajudar! 💈",
      }
    }
  }

  private async getBusinessContext(telefone: string): Promise<AgendamentoContext | null> {
    try {
      console.log(`🔍 [AI-SERVICE] Buscando contexto via webhooks para: ${telefone}`)

      // Limpar telefone
      const telefoneClean = telefone.replace(/\D/g, "")

      // 1. Buscar serviços e configuração
      const servicosResponse = await fetch(`${this.baseUrl}/api/webhooks/listar-servicos`)
      const servicosData = (await servicosResponse.json()) as {
        success: boolean
        servicos: ServicoConfigurado[]
        configuracao: Configuracoes
        error?: string
      }

      if (!servicosData.success) {
        throw new Error(`Erro ao buscar serviços: ${servicosData.error ?? "Erro desconhecido"}`)
      }

      // 2. Buscar cliente e agendamentos
      const clienteResponse = await fetch(`${this.baseUrl}/api/webhooks/buscar-cliente?telefone=${telefoneClean}`)
      const clienteData = (await clienteResponse.json()) as {
        success: boolean
        cliente?: Clientes
        agendamentos?: Agendamentos[]
        error?: string
      }

      if (!clienteData.success) {
        throw new Error(`Erro ao buscar cliente: ${clienteData.error ?? "Erro desconhecido"}`)
      }

      // 3. Buscar histórico da conversa
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.telefone, telefoneClean))
        .limit(1)
        .then((rows) => rows[0])

      let conversationHistory: Array<{ role: string; content: string }> = []

      if (conversation) {
        const dbMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(20)

        // CORREÇÃO: Garantir que todas as mensagens têm content
        conversationHistory = dbMessages
          .filter((msg) => msg.content?.trim())
          .reverse()
          .map((msg) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content ?? "", // Garantir que content nunca é undefined
          }))
      }

      console.log(`✅ [AI-SERVICE] Contexto carregado via webhooks:`, {
        servicos: servicosData.servicos.length,
        cliente: clienteData.cliente?.nome ?? "Não encontrado",
        agendamentos: clienteData.agendamentos?.length ?? 0,
        historico: conversationHistory.length,
      })

      return {
        servicos: servicosData.servicos,
        configuracao: servicosData.configuracao,
        cliente: clienteData.cliente,
        agendamentos: clienteData.agendamentos,
        conversationHistory,
      }
    } catch (error) {
      console.error("💥 [AI-SERVICE] Erro ao buscar contexto:", error)
      return null
    }
  }

  private createPersonalizedSystemPrompt(context: AgendamentoContext): string {
    const { configuracao } = context

    const horarioFuncionamento = "O horário de funcionamento pode ser consultado com a barbearia."

    const nomeEmpresa = configuracao?.nomeEmpresa ?? "nossa barbearia"

    // ... restante da lógica do prompt
    const prompt = `
# Buzz-SaaS - Assistente de Barbearia IA
...
- **NUNCA** confirme um agendamento sem antes usar a action 'verificar_horario'. A disponibilidade muda a todo momento.
- Se o cliente não informar o nome, e você precisar dele, use a action 'criar_cliente'.
- Se o cliente pedir para ver os serviços, use 'listar_servicos'.
- Você trabalha para a ${nomeEmpresa}.
- ${horarioFuncionamento}
...
`
    return prompt
  }

  private async parseAndProcessResponse(
    aiText: string,
    userMessage: string,
    telefone: string,
    context: AgendamentoContext,
  ): Promise<AIResponse> {
    try {
      // Tentar extrair um objeto JSON de dentro do texto da IA
      const jsonMatch = /```json\s*([\s\S]*?)\s*```/.exec(aiText)
      if (jsonMatch?.[1]) {
        const jsonString = jsonMatch[1]
        const parsedJson = JSON.parse(jsonString) as AIResponse // Fazer cast para o tipo esperado

        const { action, data } = parsedJson

        console.log(`🎬 [AI-SERVICE] Ação extraída: ${action}`)

        // Validar e processar a ação
        switch (action) {
          case "verificar_horario": {
            const { servico, data: dataAg, horario } = data as { servico: string; data: string; horario: string }
            const dadosVerificar = this.combinarDadosComContexto({ servico, data: dataAg, horario }, telefone)
            const disponibilidade = await this.verificarDisponibilidadeViaWebhook(dadosVerificar)

            this.atualizarContextoAgendamento(telefone, dadosVerificar)

            if (disponibilidade.disponivel) {
              return {
                message: `Ótima escolha! O horário das ${horario} de ${dayjs(dataAg).format("DD/MM")} está disponível para ${servico}. Posso confirmar?`,
                action: "agendar_direto",
                data: dadosVerificar,
              }
            } else {
              let resposta = `Poxa, o horário das ${horario} de ${dayjs(dataAg).format("DD/MM")} não está mais disponível. ${disponibilidade.motivo ?? ""}`
              if (disponibilidade.horariosAlternativos?.length) {
                resposta += `\n\nQue tal um desses horários próximos?\n- ${disponibilidade.horariosAlternativos.join("\n- ")}`
              }
              return { message: resposta }
            }
          }

          case "agendar_direto": {
            const dadosAgendamento = this.combinarDadosComContexto(data as DadosAgendamentoExtraidos, telefone)
            if (!context.cliente?.nome && !dadosAgendamento.nome) {
              this.atualizarContextoAgendamento(telefone, dadosAgendamento)
              return {
                message: "Perfeito! Para finalizar, só preciso do seu nome completo. Pode me dizer?",
                action: "criar_cliente",
                data: dadosAgendamento,
              }
            }
            dadosAgendamento.nome = dadosAgendamento.nome ?? context.cliente?.nome

            const resultado = await this.criarAgendamentoViaWebhook(dadosAgendamento)
            if (resultado.success) {
              delete this.agendamentoContexto[telefone] // Limpa o contexto após sucesso
              return { message: resultado.message ?? "Agendamento confirmado com sucesso!" }
            } else {
              return { message: resultado.message ?? "Não foi possível confirmar o agendamento." }
            }
          }

          case "criar_cliente": {
            const dadosCliente = this.combinarDadosComContexto(data as DadosAgendamentoExtraidos, telefone)
            this.atualizarContextoAgendamento(telefone, dadosCliente) // Salva o que já temos

            const nomeExtraido = this.extrairNome(userMessage)
            if (nomeExtraido) {
              const resultado = await this.criarClienteViaWebhook(telefone, nomeExtraido)
              if (resultado.success && resultado.cliente) {
                const novoContexto = { ...dadosCliente, nome: resultado.cliente.nome }
                // Se já temos todos os dados, tenta agendar direto
                if (novoContexto.servico && novoContexto.data && novoContexto.horario) {
                  return this.parseAndProcessResponse(
                    "```json\n" + JSON.stringify({ action: "agendar_direto", data: novoContexto }) + "\n```",
                    userMessage,
                    telefone,
                    context,
                  )
                }
                return {
                  message: `Prazer, ${nomeExtraido.split(" ")[0]}! Seu cadastro foi criado. Agora, que serviço e horário você gostaria?`,
                }
              }
            }
            return {
              message: "Não entendi o seu nome. Pode repetir seu nome completo, por favor?",
              action: "criar_cliente",
              data: dadosCliente,
            }
          }

          case "listar_servicos":
            return { message: this.formatarServicosNatural(context.servicos) }

          case "consultar_agendamentos":
            return { message: this.formatarAgendamentosNatural(context.agendamentos ?? []) }

          case "listar_horarios": {
            const { data: dataAg, servico } = data as { data: string; servico: string }
            const horariosDisponiveis = await this.formatarHorariosDisponiveisViaWebhook(dataAg, servico)
            this.atualizarContextoAgendamento(telefone, { data: dataAg, servico })
            return { message: horariosDisponiveis }
          }
        }
      }

      // Se não encontrou JSON ou ação válida, retorna o texto puro da IA
      return { message: aiText.replace(/```json[\s\S]*?```/g, "").trim() }
    } catch (error) {
      console.error("💥 [AI-SERVICE] Erro ao analisar resposta da IA:", error)
      return { message: "Tive um problema ao processar a resposta. Pode tentar de novo?" }
    }
  }

  private async criarClienteViaWebhook(
    telefone: string,
    nome: string,
  ): Promise<{ success: boolean; cliente?: Clientes; jaExistia: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/webhooks/criar-cliente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone, nome }),
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return (await response.json()) as { success: boolean; cliente?: Clientes; jaExistia: boolean; error?: string }
    } catch (error) {
      console.error("Erro ao criar cliente via webhook", error)
      return { success: false, jaExistia: false, error: "Falha na comunicação com o servidor." }
    }
  }

  private atualizarContextoAgendamento(telefone: string, dados: DadosAgendamentoExtraidos) {
    this.agendamentoContexto[telefone] ??= { ultimaAtualizacao: new Date() }

    const contexto = this.agendamentoContexto[telefone]

    if (dados.servico) contexto.servico = dados.servico
    if (dados.data) contexto.data = dados.data
    if (dados.horario) contexto.horario = dados.horario
    contexto.ultimaAtualizacao = new Date()
    console.log(`💾 [AI-SERVICE] Contexto de agendamento atualizado para ${telefone}:`, this.agendamentoContexto[telefone])
  }

  private combinarDadosComContexto(dadosExtraidos: DadosAgendamentoExtraidos, telefone: string) {
    const contextoSalvo = this.agendamentoContexto[telefone]
    return {
      servico: dadosExtraidos.servico ?? contextoSalvo?.servico,
      data: dadosExtraidos.data ?? contextoSalvo?.data,
      horario: dadosExtraidos.horario ?? contextoSalvo?.horario,
      nome: dadosExtraidos.nome, // Nome não persiste no contexto de agendamento
    }
  }

  private async verificarDisponibilidadeViaWebhook(dados: {
    data?: string
    horario?: string
    servico?: string
  }): Promise<{ disponivel: boolean; motivo?: string; horariosAlternativos?: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/webhooks/verificar-disponibilidade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return (await response.json()) as { disponivel: boolean; motivo?: string; horariosAlternativos?: string[] }
    } catch (error) {
      console.error("Erro ao verificar disponibilidade via webhook", error)
      return { disponivel: false, motivo: "Não foi possível verificar a disponibilidade no momento." }
    }
  }

  private async criarAgendamentoViaWebhook(dados: {
    telefone?: string
    nome?: string
    servico?: string
    data?: string
    horario?: string
  }): Promise<{ success: boolean; message?: string; agendamento?: Agendamentos }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/webhooks/criar-agendamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return (await response.json()) as { success: boolean; message?: string; agendamento?: Agendamentos }
    } catch (error) {
      console.error("Erro ao criar agendamento via webhook", error)
      return { success: false, message: "Não foi possível criar o agendamento no momento." }
    }
  }

  private async formatarHorariosDisponiveisViaWebhook(data: string, servico: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/webhooks/listar-horarios?data=${data}&servico=${encodeURIComponent(servico)}`,
      )
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const resultado = (await response.json()) as {
        success: boolean
        message?: string
        horarios?: { manha: string[]; tarde: string[] }
        error?: string
      }

      if (!resultado.success || !resultado.horarios) {
        return resultado.message ?? resultado.error ?? "Não foi possível buscar os horários."
      }

      const { manha, tarde } = resultado.horarios
      if (manha.length === 0 && tarde.length === 0) {
        return `Poxa, não tenho horários disponíveis para ${servico} no dia ${dayjs(data).format("DD/MM")}. 😕`
      }

      let resposta = `Claro! Para ${servico} no dia ${dayjs(data).format("DD/MM")}, tenho estes horários livres:\n`
      if (manha.length > 0) {
        resposta += `\n**Manhã:**\n- ${manha.join("\n- ")}`
      }
      if (tarde.length > 0) {
        resposta += `\n\n**Tarde:**\n- ${tarde.join("\n- ")}`
      }
      resposta += "\n\nQual você prefere?"
      return resposta
    } catch (error) {
      console.error("Erro ao formatar horários via webhook", error)
      return "Não consegui consultar os horários agora. Pode tentar de novo?"
    }
  }

  private shouldCreateAppointmentDirectly(message: string, context: AgendamentoContext): boolean {
    const { agendamentoEmAndamento } = context
    // Se contexto de agendamento já tem tudo, e mensagem é uma confirmação
    if (agendamentoEmAndamento?.servico && agendamentoEmAndamento?.data && agendamentoEmAndamento?.horario) {
      const lowerMessage = message.toLowerCase()
      if (lowerMessage.includes("sim") || lowerMessage.includes("pode ser") || lowerMessage.includes("confirma")) {
        return true
      }
    }
    return false
  }

  private async extractAppointmentData(
    message: string,
    context: AgendamentoContext,
  ): Promise<DadosAgendamentoExtraidos | null> {
    const { servicos } = context
    const nome = this.extrairNome(message)
    const servico = this.extrairServico(message, servicos)
    const data = this.extrairData(message)
    const horario = this.extrairHorario(message)

    if (nome || servico || data || horario) {
      const dados: DadosAgendamentoExtraidos = {
        nome: nome ?? undefined,
        servico: servico ?? undefined,
        data: data ?? undefined,
        horario: horario ?? undefined,
      }
      dados.completo = !!(
        (context.cliente?.nome ?? dados.nome) &&
        (context.agendamentoEmAndamento?.servico ?? dados.servico) &&
        (context.agendamentoEmAndamento?.data ?? dados.data) &&
        (context.agendamentoEmAndamento?.horario ?? dados.horario)
      )
      return dados
    }
    return null
  }

  private extrairNome(message: string): string | null {
    const lowerMessage = message.toLowerCase()
    // Regex para capturar padrões como "meu nome é [Nome]", "pode me chamar de [Nome]" etc.
    const regexNome = /(?:meu nome é|chamo-me|sou o|sou a|pode registrar como)\s+([A-Za-zÀ-ú\s]+)/i
    const match = regexNome.exec(lowerMessage)

    if (match?.[1]) {
      // Pega o nome capturado, remove espaços extras e capitaliza
      const nome = match[1].trim()
      return nome
        .split(" ")
        .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
        .join(" ")
    }

    return null
  }

  private extrairServico(message: string, servicos: ServicoConfigurado[]): string | null {
    const lowerMessage = message.toLowerCase()

    console.log(`🔍 [AI-SERVICE] Extraindo serviço de: "${message}"`)
    console.log(
      `🔍 [AI-SERVICE] Serviços disponíveis:`,
      servicos.map((s) => s.nome),
    )

    for (const servico of servicos) {
      if (lowerMessage.includes(servico.nome.toLowerCase())) {
        console.log(`✅ [AI-SERVICE] Serviço encontrado: ${servico.nome}`)
        return servico.nome
      }
    }

    // Palavras-chave genéricas
    if (lowerMessage.includes("corte") || lowerMessage.includes("cabelo")) {
      const corte = servicos.find(
        (s) => s.nome.toLowerCase().includes("corte") || s.nome.toLowerCase().includes("cabelo"),
      )
      if (corte) {
        console.log(`✅ [AI-SERVICE] Serviço encontrado por palavra-chave: ${corte.nome}`)
        return corte.nome
      }
    }

    if (lowerMessage.includes("barba")) {
      const barba = servicos.find((s) => s.nome.toLowerCase().includes("barba"))
      if (barba) {
        console.log(`✅ [AI-SERVICE] Serviço encontrado por palavra-chave: ${barba.nome}`)
        return barba.nome
      }
    }

    console.log(`❌ [AI-SERVICE] Nenhum serviço encontrado na mensagem`)
    return null
  }

  private extrairData(message: string): string | null {
    const hoje = dayjs()
    const lowerMessage = message.toLowerCase()

    console.log(`🔍 [AI-SERVICE] Extraindo data de: "${message}"`)

    if (lowerMessage.includes("hoje")) {
      console.log(`✅ [AI-SERVICE] Data encontrada: hoje`)
      return hoje.format("YYYY-MM-DD")
    }

    if (lowerMessage.includes("amanhã") || lowerMessage.includes("amanha")) {
      console.log(`✅ [AI-SERVICE] Data encontrada: amanhã`)
      return hoje.add(1, "day").format("YYYY-MM-DD")
    }

    // Formato DD/MM
    const regexData = /(\d{1,2})\/(\d{1,2})/
    const match = regexData.exec(message)
    if (match) {
      const dia = Number.parseInt(match[1]!)
      const mes = Number.parseInt(match[2]!)
      const ano = hoje.year()

      try {
        const data = dayjs(`${ano}-${mes.toString().padStart(2, "0")}-${dia.toString().padStart(2, "0")}`)
        if (data.isValid() && data.isAfter(hoje.subtract(1, "day"))) {
          console.log(`✅ [AI-SERVICE] Data encontrada: ${data.format("DD/MM/YYYY")}`)
          return data.format("YYYY-MM-DD")
        }
      } catch (e) {
        console.log(`❌ [AI-SERVICE] Data inválida: ${dia}/${mes}`, e)
        return null
      }
    }

    console.log(`❌ [AI-SERVICE] Nenhuma data encontrada na mensagem`)
    return null
  }

  private extrairHorario(message: string): string | null {
    // Regex aprimorado para flexibilidade
    const regex = /(\d{1,2}):(\d{2})|\d{1,2}h(\d{2})?|\b(\d{1,2})\s*horas/i
    const match = regex.exec(message.toLowerCase())

    if (match) {
      const hora = match[1] ?? match[4] ?? match[5]
      const minuto = match[2] ?? (match[3] ? "00" : "00")
      if (hora) {
        const horarioFormatado = `${hora.padStart(2, "0")}:${minuto.padStart(2, "0")}`
        return horarioFormatado
      }
    }
    return null
  }

  private createNaturalQuestion(dados: DadosAgendamentoExtraidos): string {
    const faltantes = []

    if (!dados.nome) faltantes.push("seu nome completo")
    if (!dados.servico) faltantes.push("qual serviço você quer")
    if (!dados.data) faltantes.push("que dia prefere")
    if (!dados.horario) faltantes.push("qual horário")

    if (faltantes.length === 0) {
      return "Tenho todas as informações. Posso confirmar o agendamento?"
    }
    if (faltantes.length === 1) {
      return `Perfeito! Só preciso saber ${faltantes[0]} pra finalizar seu agendamento. 😊`
    } else {
      return `Ótimo! Pra agendar, preciso saber ${faltantes.slice(0, -1).join(", ")} e ${faltantes[faltantes.length - 1]
        }. Pode me falar?`
    }
  }

  private formatarServicosNatural(servicos: ServicoConfigurado[]): string {
    if (servicos.length === 0) {
      return "Opa! Nossos serviços principais são corte, barba e corte + barba. Qual te interessa? 😊"
    }

    let texto = "Nossos serviços são:\n\n"
    servicos.forEach((servico) => {
      texto += `**${servico.nome}** - R$ ${servico.preco.toFixed(2)} (${servico.duracaoMinutos} min)\n`
    })
    texto += "\nQual você gostaria de agendar? 💈"
    return texto
  }

  private formatarAgendamentosNatural(agendamentos: Agendamentos[]): string {
    if (agendamentos.length === 0) {
      return "Você ainda não tem agendamentos comigo. Quer marcar um? 😊"
    }

    let texto = "Seus agendamentos:\n\n"
    agendamentos.forEach((agendamento) => {
      const data = dayjs(agendamento.dataHora)
      const status = agendamento.status === "agendado" ? "✅" : agendamento.status === "concluido" ? "✔️" : "❌"
      texto += `${status} **${agendamento.servico ?? ""}** - ${data.format("DD/MM")} às ${data.format("HH:mm")}\n`
    })

    return texto
  }

  private isPrimeiraMensagemDaConversa(
    telefone: string,
    conversationHistory: Array<{ role: string; content?: string }>,
  ): boolean {
    // Se já fizemos a saudação para este telefone, não é primeira mensagem
    if (this.saudacoesFeitas.has(telefone)) {
      return false
    }

    // Se não há histórico ou há apenas 1 mensagem (a atual), é primeira mensagem
    return conversationHistory.length <= 1
  }

  private async criarSaudacaoPersonalizada(
    cliente: Clientes | undefined,
    mensagemUsuario: string,
  ): Promise<string | null> {
    try {
      // Determinar o tipo de saudação baseado na mensagem do usuário
      const tipoSaudacao = this.determinarTipoSaudacao(mensagemUsuario)
      if (cliente?.nome) {
        // Cliente cadastrado - usar primeiro nome
        const primeiroNome = this.extrairPrimeiroNome(cliente.nome)
        return this.gerarSaudacaoComNome(primeiroNome, tipoSaudacao)
      } else {
        // Cliente não cadastrado - saudação genérica
        return this.gerarSaudacaoGenerica(tipoSaudacao)
      }
    } catch (error) {
      console.error("Erro ao criar saudação:", error)
      return null
    }
  }

  private extrairPrimeiroNome(nomeCompleto: string): string {
    const nomes = nomeCompleto.trim().split(/\s+/)
    const primeiroNome = nomes[0]
    if (!primeiroNome) return ""

    // Capitalizar primeira letra
    return primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase()
  }

  private determinarTipoSaudacao(mensagem: string): "formal" | "casual" | "urgente" | "servico" {
    const lowerMessage = mensagem.toLowerCase()

    // Detectar urgência
    if (lowerMessage.includes("urgente") || lowerMessage.includes("rápido") || lowerMessage.includes("agora")) {
      return "urgente"
    }

    // Detectar pedido direto de serviço
    if (
      lowerMessage.includes("agendar") ||
      lowerMessage.includes("marcar") ||
      lowerMessage.includes("corte") ||
      lowerMessage.includes("barba")
    ) {
      return "servico"
    }

    // Detectar saudações formais
    if (lowerMessage.includes("bom dia") || lowerMessage.includes("boa tarde") || lowerMessage.includes("boa noite")) {
      return "formal"
    }

    // Padrão casual
    return "casual"
  }

  private gerarSaudacaoComNome(
    primeiroNome: string,
    tipo: "formal" | "casual" | "urgente" | "servico",
  ): string {
    const frases = {
      formal: [
        `Olá ${primeiroNome}! Tudo bem? 😊`,
        `Oi ${primeiroNome}! Como você está?`,
        `${primeiroNome}! Que bom te ver por aqui! 😊`,
      ],
      casual: [`E aí ${primeiroNome}! Tudo certo? 😄`, `Opa ${primeiroNome}! Beleza?`, `Olá ${primeiroNome}!`],
      urgente: [`Oi ${primeiroNome}! Vou te ajudar rapidinho! 🚀`, `${primeiroNome}! Estou aqui pra te atender! 😊`],
      servico: [`Olá ${primeiroNome}! Vamos agendar seu horário? 💈`, `Oi ${primeiroNome}! Que bom que você voltou! 😊`],
    }

    const opcoes = frases[tipo]
    const frase = opcoes[Math.floor(Math.random() * opcoes.length)]!
    return `${frase} Sou o assistente da barbearia. Como posso te ajudar?`
  }

  private gerarSaudacaoGenerica(tipo: "formal" | "casual" | "urgente" | "servico"): string {
    const frases = {
      formal: [`Olá! Tudo bem? 😊`, `Oi! Como posso te ajudar?`],
      casual: [`E aí! Tudo certo? 😄`, `Opa! Beleza?`, `Olá!`],
      urgente: [`Oi! Vou te ajudar rapidinho! 🚀`, `Pode falar, estou aqui pra te atender! 😊`],
      servico: [`Olá! Vamos agendar seu horário? 💈`, `Oi! Quer marcar um horário?`],
    }
    const opcoes = frases[tipo]
    const frase = opcoes[Math.floor(Math.random() * opcoes.length)]!
    return `${frase} Sou o assistente da barbearia. Em que posso ajudar?`
  }
}

export const aiService = new AIService()
