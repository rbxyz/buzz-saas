import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { db } from "@/server/db"
import { configuracoes, clientes, agendamentos } from "@/server/db/schema"
import { eq, desc } from "drizzle-orm"
import dayjs from "dayjs"
import "dayjs/locale/pt-br"

dayjs.locale("pt-br")

type DiaSemana = "domingo" | "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado"

interface ServicoConfigurado {
  nome: string
  preco: number
  duracaoMinutos: number
}

interface AgendamentoContext {
  servicos: ServicoConfigurado[]
  configuracao: any
  cliente?: any
}

interface AIResponse {
  message: string
  action?: "agendar" | "listar_servicos" | "listar_horarios" | "cancelar" | "reagendar" | "consultar_agendamentos"
  data?: any
}

function getDiaSemana(date: Date): DiaSemana {
  const dias: DiaSemana[] = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]
  const dayIndex = date.getDay()
  const dia = dias[dayIndex]
  if (!dia) {
    throw new Error(`Índice de dia inválido: ${dayIndex}`)
  }
  return dia
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
      const context = await this.getBusinessContext(telefone)

      // Criar prompt do sistema
      const systemPrompt = this.createSystemPrompt(context)

      // Preparar mensagens para a IA
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-10), // Manter apenas as últimas 10 mensagens
        { role: "user", content: message },
      ]

      // Gerar resposta da IA
      const result = await generateText({
        model: this.model,
        messages,
        temperature: 0.7,
        maxTokens: 800,
      })

      // Analisar a resposta para identificar ações
      const aiResponse = await this.parseAIResponse(result.text, message, telefone, context)

      return aiResponse
    } catch (error) {
      console.error("Erro no processamento da IA:", error)
      return {
        message: "Desculpe, ocorreu um erro. Tente novamente em alguns instantes. 🤖",
      }
    }
  }

  private async getBusinessContext(telefone: string): Promise<AgendamentoContext> {
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

      // Buscar cliente pelo telefone
      const cliente = await db
        .select()
        .from(clientes)
        .where(eq(clientes.telefone, telefone))
        .limit(1)
        .then((rows) => rows[0] || null)

      return {
        servicos: (config.servicos as ServicoConfigurado[]) || [],
        configuracao: config,
        cliente,
      }
    } catch (error) {
      console.error("Erro ao buscar contexto:", error)
      return {
        servicos: [],
        configuracao: null,
      }
    }
  }

  private createSystemPrompt(context: AgendamentoContext): string {
    const { servicos, configuracao, cliente } = context

    const servicosTexto =
      servicos.length > 0
        ? servicos.map((s) => `• ${s.nome}: R$ ${s.preco.toFixed(2)} (${s.duracaoMinutos} min)`).join("\n")
        : "Nenhum serviço configurado"

    return `Você é um assistente virtual especializado em agendamentos para ${configuracao?.nome || "nossa barbearia"}.

🏪 **INFORMAÇÕES DO NEGÓCIO:**
- Nome: ${configuracao?.nome || "Barbearia"}
- Telefone: ${configuracao?.telefone || "Não informado"}
- Endereço: ${configuracao?.endereco || "Não informado"}

💈 **SERVIÇOS DISPONÍVEIS:**
${servicosTexto}

⏰ **HORÁRIOS DE FUNCIONAMENTO:**
- Dias: ${configuracao?.dias?.join(", ") || "Segunda a Sexta"}
- Horário: ${configuracao?.horaInicio || "09:00"} às ${configuracao?.horaFim || "18:00"}

👤 **CLIENTE:**
${cliente ? `Cliente identificado: ${cliente.nome} (${cliente.telefone})` : "Cliente não cadastrado - colete nome para agendamento"}

🎯 **SUAS FUNÇÕES:**
1. **Agendar serviços** - Colete: nome (se novo cliente), serviço, data e horário
2. **Listar serviços** - Mostre todos os serviços com preços e duração
3. **Consultar horários** - Mostre horários disponíveis para uma data específica
4. **Consultar agendamentos** - Mostre agendamentos do cliente
5. **Cancelar/Reagendar** - Ajude com alterações de agendamentos

📋 **INSTRUÇÕES:**
- Seja cordial, profissional e use emojis apropriados
- Para agendamentos, SEMPRE confirme todos os dados antes de finalizar
- Se cliente não cadastrado, colete nome completo
- Valide datas (não aceite datas passadas)
- Confirme disponibilidade antes de agendar
- Use linguagem natural e amigável
- Forneça informações claras sobre preços e duração

🔧 **AÇÕES ESPECIAIS:**
- Use "AÇÃO:agendar" quando tiver todos os dados para agendamento
- Use "AÇÃO:listar_servicos" para mostrar serviços
- Use "AÇÃO:listar_horarios" para mostrar horários de uma data
- Use "AÇÃO:consultar_agendamentos" para ver agendamentos do cliente
- Use "AÇÃO:cancelar" para cancelamentos
- Use "AÇÃO:reagendar" para reagendamentos

Responda sempre de forma útil e focada em ajudar o cliente!`
  }

  private async parseAIResponse(
    aiText: string,
    userMessage: string,
    telefone: string,
    context: AgendamentoContext,
  ): Promise<AIResponse> {
    const lowerMessage = userMessage.toLowerCase()
    const lowerAI = aiText.toLowerCase()

    // Detectar ações específicas
    if (
      lowerAI.includes("ação:listar_servicos") ||
      lowerMessage.includes("serviços") ||
      lowerMessage.includes("servicos")
    ) {
      const servicosTexto = await this.formatarServicos(context.servicos)
      return {
        message: servicosTexto,
        action: "listar_servicos",
      }
    }

    if (
      lowerAI.includes("ação:listar_horarios") ||
      lowerMessage.includes("horários") ||
      lowerMessage.includes("horarios")
    ) {
      // Extrair data da mensagem se possível
      const dataExtraida = this.extrairData(userMessage)
      if (dataExtraida) {
        const horariosTexto = await this.formatarHorarios(dataExtraida, context.servicos[0]?.nome || "")
        return {
          message: horariosTexto,
          action: "listar_horarios",
          data: { data: dataExtraida },
        }
      } else {
        return {
          message:
            "📅 Para consultar horários disponíveis, me informe a data desejada. Exemplo: 'horários para amanhã' ou 'horários para 15/12'",
          action: "listar_horarios",
        }
      }
    }

    if (
      lowerAI.includes("ação:consultar_agendamentos") ||
      lowerMessage.includes("meus agendamentos") ||
      lowerMessage.includes("consultar")
    ) {
      if (context.cliente) {
        const agendamentosTexto = await this.formatarAgendamentosCliente(context.cliente.id)
        return {
          message: agendamentosTexto,
          action: "consultar_agendamentos",
        }
      } else {
        return {
          message:
            "Para consultar seus agendamentos, preciso que você se identifique primeiro. Qual é seu nome completo?",
        }
      }
    }

    if (lowerAI.includes("ação:agendar") || this.detectarIntencaoAgendamento(userMessage)) {
      const dadosAgendamento = this.extrairDadosAgendamento(userMessage, context)

      if (dadosAgendamento.completo) {
        return {
          message: `✅ Perfeito! Vou confirmar seu agendamento:

📋 **Dados do Agendamento:**
• Nome: ${dadosAgendamento.nome}
• Serviço: ${dadosAgendamento.servico}
• Data: ${dadosAgendamento.data}
• Horário: ${dadosAgendamento.horario}

Confirma esses dados? Responda 'SIM' para finalizar o agendamento.`,
          action: "agendar",
          data: dadosAgendamento,
        }
      } else {
        const camposFaltantes = this.identificarCamposFaltantes(dadosAgendamento)
        return {
          message: `Para finalizar seu agendamento, preciso de mais algumas informações:\n\n${camposFaltantes}`,
        }
      }
    }

    // Se chegou até aqui, retornar resposta padrão da IA
    return {
      message: aiText,
    }
  }

  private async formatarServicos(servicos: ServicoConfigurado[]): Promise<string> {
    if (servicos.length === 0) {
      return "Desculpe, não temos serviços configurados no momento. Entre em contato conosco para mais informações."
    }

    let texto = "💈 **NOSSOS SERVIÇOS:**\n\n"
    servicos.forEach((servico, index) => {
      texto += `${index + 1}. **${servico.nome}**\n`
      texto += `   💰 R$ ${servico.preco.toFixed(2)}\n`
      texto += `   ⏱️ ${servico.duracaoMinutos} minutos\n\n`
    })

    texto += "Para agendar, me diga qual serviço deseja e sua data/horário preferido! 😊"
    return texto
  }

  private async formatarHorarios(data: string, servico: string): Promise<string> {
    try {
      // Aqui você implementaria a lógica para buscar horários disponíveis
      // Por simplicidade, vou retornar uma mensagem padrão
      const dataObj = dayjs(data)
      const diaSemana = getDiaSemana(dataObj.toDate())

      return `📅 **Horários disponíveis para ${dataObj.format("DD/MM/YYYY")} (${diaSemana}):**

🌅 **Manhã:**
• 09:00 • 09:30 • 10:00 • 10:30 • 11:00 • 11:30

🌞 **Tarde:**
• 14:00 • 14:30 • 15:00 • 15:30 • 16:00 • 16:30 • 17:00 • 17:30

Para agendar, me diga: "Quero agendar [serviço] no dia ${dataObj.format("DD/MM")} às [horário]"`
    } catch (error) {
      return "❌ Data inválida. Use o formato DD/MM/YYYY ou palavras como 'hoje', 'amanhã'."
    }
  }

  private async formatarAgendamentosCliente(clienteId: string): Promise<string> {
    try {
      const agendamentosCliente = await db
        .select()
        .from(agendamentos)
        .where(eq(agendamentos.clienteId, clienteId))
        .orderBy(desc(agendamentos.dataHora))
        .limit(5)

      if (agendamentosCliente.length === 0) {
        return "📋 Você não possui agendamentos registrados."
      }

      let texto = "📋 **SEUS AGENDAMENTOS:**\n\n"

      agendamentosCliente.forEach((agendamento, index) => {
        const data = dayjs(agendamento.dataHora)
        const status = agendamento.status === "agendado" ? "✅" : agendamento.status === "concluido" ? "✔️" : "❌"

        texto += `${index + 1}. ${status} **${agendamento.servico}**\n`
        texto += `   📅 ${data.format("DD/MM/YYYY")} às ${data.format("HH:mm")}\n`
        texto += `   📊 Status: ${agendamento.status}\n\n`
      })

      return texto
    } catch (error) {
      return "❌ Erro ao consultar agendamentos. Tente novamente."
    }
  }

  private detectarIntencaoAgendamento(message: string): boolean {
    const palavrasChave = [
      "agendar",
      "marcar",
      "quero",
      "gostaria",
      "preciso",
      "horário",
      "data",
      "dia",
      "amanhã",
      "hoje",
    ]

    const lowerMessage = message.toLowerCase()
    return palavrasChave.some((palavra) => lowerMessage.includes(palavra))
  }

  private extrairData(message: string): string | null {
    const hoje = dayjs()
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes("hoje")) {
      return hoje.format("YYYY-MM-DD")
    }

    if (lowerMessage.includes("amanhã")) {
      return hoje.add(1, "day").format("YYYY-MM-DD")
    }

    // Tentar extrair data no formato DD/MM
    const regexData = /(\d{1,2})\/(\d{1,2})/
    const match = message.match(regexData)

    if (match) {
      const dia = Number.parseInt(match[1]!)
      const mes = Number.parseInt(match[2]!)
      const ano = hoje.year()

      try {
        const data = dayjs(`${ano}-${mes.toString().padStart(2, "0")}-${dia.toString().padStart(2, "0")}`)
        if (data.isValid()) {
          return data.format("YYYY-MM-DD")
        }
      } catch {
        return null
      }
    }

    return null
  }

  private extrairDadosAgendamento(message: string, context: AgendamentoContext) {
    const dados = {
      nome: context.cliente?.nome || null,
      servico: null as string | null,
      data: null as string | null,
      horario: null as string | null,
      completo: false,
    }

    // Extrair serviço
    const servicosDisponiveis = context.servicos.map((s) => s.nome.toLowerCase())
    const lowerMessage = message.toLowerCase()

    for (const servico of context.servicos) {
      if (lowerMessage.includes(servico.nome.toLowerCase())) {
        dados.servico = servico.nome
        break
      }
    }

    // Extrair data
    dados.data = this.extrairData(message)

    // Extrair horário
    const regexHorario = /(\d{1,2}):?(\d{2})/
    const matchHorario = message.match(regexHorario)
    if (matchHorario) {
      const hora = matchHorario[1]!.padStart(2, "0")
      const minuto = matchHorario[2]!
      dados.horario = `${hora}:${minuto}`
    }

    // Verificar se está completo
    dados.completo = !!(dados.nome && dados.servico && dados.data && dados.horario)

    return dados
  }

  private identificarCamposFaltantes(dados: any): string {
    const faltantes = []

    if (!dados.nome) {
      faltantes.push("• **Nome completo**")
    }
    if (!dados.servico) {
      faltantes.push("• **Serviço desejado** (digite 'serviços' para ver opções)")
    }
    if (!dados.data) {
      faltantes.push("• **Data** (ex: hoje, amanhã, 15/12)")
    }
    if (!dados.horario) {
      faltantes.push("• **Horário** (ex: 14:30)")
    }

    return faltantes.join("\n")
  }

  // Método para criar agendamento via IA
  async criarAgendamentoIA(dados: {
    telefone: string
    nome: string
    servico: string
    data: string
    horario: string
  }) {
    try {
      // Verificar se já existe cliente
      let cliente = await db
        .select()
        .from(clientes)
        .where(eq(clientes.telefone, dados.telefone))
        .limit(1)
        .then((rows) => rows[0] || null)

      // Criar cliente se não existir
      if (!cliente) {
        const novoCliente = await db
          .insert(clientes)
          .values({
            nome: dados.nome,
            telefone: dados.telefone,
          })
          .returning()
        cliente = novoCliente[0]!
      }

      // Buscar configuração para validar serviço
      const config = await db.query.configuracoes.findFirst()
      if (!config) throw new Error("Configuração não encontrada")

      const servicos = config.servicos as ServicoConfigurado[]
      const servicoSelecionado = servicos.find((s) => s.nome === dados.servico)
      if (!servicoSelecionado) throw new Error("Serviço não encontrado")

      // Criar agendamento
      const dataHora = dayjs(`${dados.data}T${dados.horario}`).toDate()

      const agendamento = await db
        .insert(agendamentos)
        .values({
          clienteId: cliente.id,
          dataHora,
          servico: dados.servico,
          status: "agendado",
          valorCobrado: servicoSelecionado.preco,
          duracaoMinutos: servicoSelecionado.duracaoMinutos ?? 30,
        })
        .returning()

      return {
        success: true,
        agendamento: agendamento[0],
        message: `🎉 **Agendamento confirmado com sucesso!**

📋 **Detalhes:**
• Cliente: ${dados.nome}
• Serviço: ${dados.servico}
• Data: ${dayjs(dados.data).format("DD/MM/YYYY")}
• Horário: ${dados.horario}
• Valor: R$ ${servicoSelecionado.preco.toFixed(2)}

Chegue com 10 minutos de antecedência. Até lá! 😊`,
      }
    } catch (error) {
      console.error("Erro ao criar agendamento via IA:", error)
      return {
        success: false,
        message: "❌ Erro ao criar agendamento. Verifique os dados e tente novamente.",
      }
    }
  }
}

// Instância singleton do serviço
export const aiService = new AIService()
