import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { db } from "@/server/db"
import { conversations, messages } from "@/server/db/schema"
import { eq, desc } from "drizzle-orm"
import dayjs from "dayjs"
import "dayjs/locale/pt-br"

dayjs.locale("pt-br")

interface ServicoConfigurado {
  nome: string
  preco: number
  duracaoMinutos: number
}

interface AgendamentoContext {
  servicos: ServicoConfigurado[]
  configuracao: any
  cliente?: any
  agendamentos?: any[]
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
  data?: any
}

export class AIService {
  private model = groq("llama-3.1-8b-instant")
  private baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

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
  private saudacoesFeitas: Set<string> = new Set()

  async processMessage(
    message: string,
    telefone: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<AIResponse> {
    try {
      console.log(`🧠 [AI-SERVICE] Processando mensagem: "${message}"`)
      console.log(`📱 [AI-SERVICE] Telefone do cliente: ${telefone}`)

      // Verificar se é a primeira mensagem desta conversa
      const isPrimeiraMensagem = this.isPrimeiraMensagemDaConversa(telefone, conversationHistory)
      console.log(`👋 [AI-SERVICE] É primeira mensagem? ${isPrimeiraMensagem}`)

      // Buscar contexto completo via webhooks
      const context = await this.getBusinessContext(telefone)

      // Adicionar contexto de agendamento em andamento
      if (this.agendamentoContexto[telefone]) {
        // Verificar se o contexto não está expirado (30 minutos)
        const agora = new Date()
        const ultimaAtualizacao = this.agendamentoContexto[telefone].ultimaAtualizacao
        const diferencaMinutos = (agora.getTime() - ultimaAtualizacao.getTime()) / (1000 * 60)

        if (diferencaMinutos < 30) {
          context.agendamentoEmAndamento = this.agendamentoContexto[telefone]
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

      // Preparar mensagens para a IA
      const messages = [
        { role: "system", content: systemPrompt },
        ...context.conversationHistory.slice(-10),
        { role: "user", content: message },
      ]

      console.log(`🤖 [AI-SERVICE] Enviando para IA: ${messages.length} mensagens`)

      // Gerar resposta da IA
      const result = await generateText({
        model: this.model,
        messages,
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

  private async getBusinessContext(telefone: string): Promise<AgendamentoContext> {
    try {
      console.log(`🔍 [AI-SERVICE] Buscando contexto via webhooks para: ${telefone}`)

      // Limpar telefone
      const telefoneClean = telefone.replace(/\D/g, "")

      // 1. Buscar serviços e configuração
      const servicosResponse = await fetch(`${this.baseUrl}/api/webhooks/listar-servicos`)
      const servicosData = await servicosResponse.json()

      if (!servicosData.success) {
        throw new Error("Erro ao buscar serviços")
      }

      // 2. Buscar cliente e agendamentos
      const clienteResponse = await fetch(`${this.baseUrl}/api/webhooks/buscar-cliente?telefone=${telefoneClean}`)
      const clienteData = await clienteResponse.json()

      if (!clienteData.success) {
        throw new Error("Erro ao buscar cliente")
      }

      // 3. Buscar histórico da conversa
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.telefone, telefoneClean))
        .limit(1)
        .then((rows) => rows[0] || null)

      let conversationHistory: Array<{ role: string; content: string }> = []

      if (conversation) {
        const dbMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(20)

        conversationHistory = dbMessages.reverse().map((msg) => ({
          role: msg.remetente === "cliente" ? "user" : "assistant",
          content: msg.conteudo,
        }))
      }

      console.log(`✅ [AI-SERVICE] Contexto carregado via webhooks:`, {
        servicos: servicosData.servicos.length,
        cliente: clienteData.cliente?.nome || "Não encontrado",
        agendamentos: clienteData.agendamentos.length,
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
      return {
        servicos: [
          { nome: "Corte", preco: 25.0, duracaoMinutos: 30 },
          { nome: "Barba", preco: 15.0, duracaoMinutos: 20 },
          { nome: "Corte + Barba", preco: 35.0, duracaoMinutos: 45 },
        ],
        configuracao: null,
        conversationHistory: [],
      }
    }
  }

  private createPersonalizedSystemPrompt(context: AgendamentoContext): string {
    const { servicos, configuracao, cliente, agendamentos, conversationHistory, agendamentoEmAndamento } = context

    const servicosTexto = servicos
      .map((s) => `• ${s.nome}: R$ ${s.preco.toFixed(2)} (${s.duracaoMinutos} min)`)
      .join("\n")

    const clienteInfo = cliente
      ? `Cliente conhecido: ${cliente.nome} (telefone: ${cliente.telefone})`
      : "Cliente novo (precisa perguntar o nome para cadastro)"

    const agendamentosInfo =
      agendamentos && agendamentos.length > 0
        ? `Cliente tem ${agendamentos.length} agendamentos anteriores`
        : "Cliente não tem agendamentos anteriores"

    const historicoInfo =
      conversationHistory.length > 0
        ? `Histórico da conversa: ${conversationHistory.length} mensagens anteriores`
        : "Primeira interação com este cliente"

    // Informações sobre agendamento em andamento
    let agendamentoEmAndamentoInfo = ""
    if (agendamentoEmAndamento) {
      agendamentoEmAndamentoInfo = `
🔄 **AGENDAMENTO EM ANDAMENTO:**
${agendamentoEmAndamento.servico ? `• Serviço: ${agendamentoEmAndamento.servico}` : "• Serviço: não informado"}
${agendamentoEmAndamento.data ? `• Data: ${agendamentoEmAndamento.data}` : "• Data: não informada"}
${agendamentoEmAndamento.horario ? `• Horário: ${agendamentoEmAndamento.horario}` : "• Horário: não informado"}
`
    }

    return `Você é o assistente virtual da ${configuracao?.nome || "Barbearia do Ruan"}.

🎯 **SUA PERSONALIDADE:**
- Seja CORDIAL, AMIGÁVEL e NATURAL como uma pessoa real
- Use linguagem brasileira informal mas respeitosa
- Seja SUCINTO mas completo nas respostas
- Demonstre interesse genuíno em ajudar
- Lembre-se sempre do contexto da conversa

🏪 **INFORMAÇÕES DO NEGÓCIO:**
- Nome: ${configuracao?.nome || "Barbearia do Ruan"}
- Telefone: ${configuracao?.telefone || "(51) 98761-4130"}
- Endereço: ${configuracao?.endereco || "Rua Principal, 123"}
- Horário: ${configuracao?.horaInicio || "09:00"} às ${configuracao?.horaFim || "18:00"}

💈 **SERVIÇOS DISPONÍVEIS:**
${servicosTexto}

👤 **CLIENTE ATUAL:**
${clienteInfo}
${agendamentosInfo}
${agendamentoEmAndamentoInfo}

📝 **CONTEXTO DA CONVERSA:**
${historicoInfo}

🎯 **SUAS RESPONSABILIDADES:**
1. **Cumprimentar** de forma calorosa na primeira mensagem
2. **Lembrar** do contexto das mensagens anteriores
3. **Perguntar o nome** se for cliente novo (MUITO IMPORTANTE)
4. **Verificar disponibilidade** antes de agendar
5. **Agendar AUTOMATICAMENTE** quando tiver: nome, serviço, data e horário disponível
6. **Perguntar** de forma natural o que falta para agendar
7. **Ser proativo** em sugerir horários e serviços

💬 **COMO CONVERSAR:**
- Use "oi", "olá", "tudo bem?" naturalmente
- Faça perguntas abertas: "O que você precisa hoje?"
- Seja empático: "Entendi!", "Perfeito!", "Ótima escolha!"
- Use emojis com moderação: 😊 💈 ✅ 📅

⚠️ **IMPORTANTE PARA NOVOS CLIENTES:**
- Se o cliente não estiver cadastrado, SEMPRE pergunte o nome completo
- Explique que o nome é necessário para o cadastro
- Só prossiga com agendamento após ter o nome

🔧 **AÇÕES OBRIGATÓRIAS - USE SEMPRE QUE NECESSÁRIO:**

**PARA LISTAR SERVIÇOS:**
- Quando cliente perguntar sobre serviços, preços ou o que vocês fazem
- SEMPRE responda com: "WEBHOOK:listar_servicos"
- Exemplo: Cliente: "Quais serviços vocês fazem?" → Você: "WEBHOOK:listar_servicos"

**PARA AGENDAR:**
- Quando tiver TODOS os dados (nome, serviço, data, horário)
- SEMPRE use: "WEBHOOK:criar_agendamento"
- Exemplo: "João quer corte para 24/06 às 10h" → "WEBHOOK:criar_agendamento"

**PARA VERIFICAR HORÁRIOS:**
- Quando cliente perguntar horários disponíveis
- SEMPRE use: "WEBHOOK:listar_horarios"
- Exemplo: "Que horários têm para amanhã?" → "WEBHOOK:listar_horarios"

**PARA VERIFICAR DISPONIBILIDADE:**
- Antes de confirmar qualquer agendamento
- SEMPRE use: "WEBHOOK:verificar_disponibilidade"
- Exemplo: Antes de agendar → "WEBHOOK:verificar_disponibilidade"

**PARA CONSULTAR AGENDAMENTOS:**
- Quando cliente perguntar sobre seus agendamentos
- SEMPRE use: "WEBHOOK:consultar_agendamentos"
- Exemplo: "Quais são meus agendamentos?" → "WEBHOOK:consultar_agendamentos"

📋 **EXEMPLOS PRÁTICOS:**

Cliente: "Quais serviços vocês fazem?"
Você: "WEBHOOK:listar_servicos"

Cliente: "Quero agendar um corte para amanhã às 14h"
Você: "WEBHOOK:verificar_disponibilidade" (primeiro verificar)
Se disponível: "WEBHOOK:criar_agendamento"

Cliente: "Que horários têm para segunda?"
Você: "WEBHOOK:listar_horarios"

Cliente: "Quais são meus agendamentos?"
Você: "WEBHOOK:consultar_agendamentos"

⚠️ **REGRAS CRÍTICAS:**
- NUNCA invente informações sobre serviços - SEMPRE use WEBHOOK:listar_servicos
- NUNCA confirme agendamento sem usar WEBHOOK:verificar_disponibilidade
- NUNCA liste horários sem usar WEBHOOK:listar_horarios
- SEMPRE use os webhooks para qualquer consulta ou ação
- Se não souber algo, use o webhook apropriado

🚨 **IMPORTANTE:**
- Toda vez que precisar de informações do sistema, use WEBHOOK:(ação)
- Não invente respostas - sempre consulte via webhook
- Os webhooks são sua fonte de verdade para tudo`
  }

  private async parseAndProcessResponse(
    aiText: string,
    userMessage: string,
    telefone: string,
    context: AgendamentoContext,
  ): Promise<AIResponse> {
    console.log(`🔍 [AI-SERVICE] Analisando resposta da IA: "${aiText}"`)
    console.log(`🔍 [AI-SERVICE] Mensagem do usuário: "${userMessage}"`)

    const lowerMessage = userMessage.toLowerCase()
    const lowerAI = aiText.toLowerCase()

    // Extrair dados da mensagem atual
    const dadosExtraidos = await this.extractAppointmentData(userMessage, context)

    // Atualizar contexto de agendamento com os dados extraídos
    this.atualizarContextoAgendamento(telefone, dadosExtraidos)

    // Combinar dados extraídos com contexto de agendamento
    const dadosAgendamento = this.combinarDadosComContexto(dadosExtraidos, telefone)
    console.log(`📋 [AI-SERVICE] Dados combinados para agendamento:`, dadosAgendamento)

    // 1. DETECTAR WEBHOOKS EXPLÍCITOS NA RESPOSTA DA IA
    if (lowerAI.includes("webhook:listar_servicos")) {
      console.log(`🎯 [AI-SERVICE] Detectado: WEBHOOK:listar_servicos`)
      const servicosTexto = this.formatarServicosNatural(context.servicos)
      return { message: servicosTexto, action: "listar_servicos" }
    }

    if (lowerAI.includes("webhook:listar_horarios")) {
      console.log(`🎯 [AI-SERVICE] Detectado: WEBHOOK:listar_horarios`)
      const dataExtraida = dadosAgendamento.data || dayjs().format("YYYY-MM-DD")
      const horariosTexto = await this.formatarHorariosDisponiveisViaWebhook(
        dataExtraida,
        context.servicos[0]?.nome || "Corte",
      )
      return { message: horariosTexto, action: "listar_horarios", data: { data: dataExtraida } }
    }

    if (lowerAI.includes("webhook:consultar_agendamentos")) {
      console.log(`🎯 [AI-SERVICE] Detectado: WEBHOOK:consultar_agendamentos`)
      const agendamentosTexto = this.formatarAgendamentosNatural(context.agendamentos || [])
      return { message: agendamentosTexto, action: "consultar_agendamentos" }
    }

    if (lowerAI.includes("webhook:criar_agendamento")) {
      console.log(`🎯 [AI-SERVICE] Detectado: WEBHOOK:criar_agendamento`)

      // Se não temos o nome e não é cliente cadastrado, precisamos perguntar
      if (!dadosAgendamento.nome && !context.cliente) {
        console.log(`❌ [AI-SERVICE] Nome não encontrado e cliente não cadastrado`)
        return {
          message: "Oi! Para fazer seu agendamento, preciso saber seu nome completo, por favor! 😊",
        }
      }

      // Usar nome do cliente cadastrado se não tiver na mensagem
      if (!dadosAgendamento.nome && context.cliente) {
        dadosAgendamento.nome = context.cliente.nome
      }

      if (dadosAgendamento.servico && dadosAgendamento.data && dadosAgendamento.horario) {
        console.log(`⏳ [AI-SERVICE] Verificando disponibilidade via webhook:`, dadosAgendamento)

        // Verificar disponibilidade via webhook
        const verificacao = await this.verificarDisponibilidadeViaWebhook({
          data: dadosAgendamento.data,
          horario: dadosAgendamento.horario,
          servico: dadosAgendamento.servico,
        })

        if (verificacao.disponivel) {
          // Horário disponível, criar agendamento via webhook
          console.log(`✅ [AI-SERVICE] Horário disponível, criando agendamento via webhook`)

          const resultado = await this.criarAgendamentoViaWebhook({
            telefone,
            nome: dadosAgendamento.nome,
            servico: dadosAgendamento.servico,
            data: dadosAgendamento.data,
            horario: dadosAgendamento.horario,
          })

          // Limpar contexto de agendamento após sucesso
          if (resultado.success) {
            delete this.agendamentoContexto[telefone]
          }

          return {
            message: resultado.message,
            action: "agendar_direto",
            data: resultado,
          }
        } else {
          // Horário não disponível, sugerir alternativas
          console.log(`❌ [AI-SERVICE] Horário não disponível:`, verificacao.motivo)

          let mensagemIndisponivel = `Ops! O horário ${dadosAgendamento.horario} do dia ${dayjs(dadosAgendamento.data).format("DD/MM")} não está disponível. 😅\n\n`

          if (verificacao.horariosAlternativos && verificacao.horariosAlternativos.length > 0) {
            mensagemIndisponivel += `**Horários disponíveis para o mesmo dia:**\n`
            verificacao.horariosAlternativos.forEach((horario) => {
              mensagemIndisponivel += `• ${horario}\n`
            })
            mensagemIndisponivel += `\nQual desses horários te atende melhor? 😊`
          } else {
            mensagemIndisponivel += `Infelizmente não temos outros horários disponíveis neste dia. Que tal escolher outro dia? 📅`
          }

          return {
            message: mensagemIndisponivel,
            action: "verificar_horario",
            data: { verificacao, dadosAgendamento },
          }
        }
      } else {
        // Perguntar o que falta de forma natural
        const pergunta = this.createNaturalQuestion(dadosAgendamento)
        return { message: pergunta }
      }
    }

    if (lowerAI.includes("webhook:verificar_disponibilidade")) {
      console.log(`🎯 [AI-SERVICE] Detectado: WEBHOOK:verificar_disponibilidade`)

      if (dadosAgendamento.servico && dadosAgendamento.data && dadosAgendamento.horario) {
        console.log(`⏳ [AI-SERVICE] Verificando disponibilidade via webhook:`, dadosAgendamento)

        // Verificar disponibilidade via webhook
        const verificacao = await this.verificarDisponibilidadeViaWebhook({
          data: dadosAgendamento.data,
          horario: dadosAgendamento.horario,
          servico: dadosAgendamento.servico,
        })

        if (verificacao.disponivel) {
          return {
            message: `✅ Horário disponível! O horário ${dadosAgendamento.horario} do dia ${dayjs(dadosAgendamento.data).format("DD/MM")} está disponível para ${dadosAgendamento.servico}.\n\nDeseja confirmar o agendamento?`,
            action: "verificar_horario",
            data: { verificacao, dadosAgendamento },
          }
        } else {
          // Horário não disponível, sugerir alternativas
          console.log(`❌ [AI-SERVICE] Horário não disponível:`, verificacao.motivo)

          let mensagemIndisponivel = `Ops! O horário ${dadosAgendamento.horario} do dia ${dayjs(dadosAgendamento.data).format("DD/MM")} não está disponível. 😅\n\n`

          if (verificacao.horariosAlternativos && verificacao.horariosAlternativos.length > 0) {
            mensagemIndisponivel += `**Horários disponíveis para o mesmo dia:**\n`
            verificacao.horariosAlternativos.forEach((horario) => {
              mensagemIndisponivel += `• ${horario}\n`
            })
            mensagemIndisponivel += `\nQual desses horários te atende melhor? 😊`
          } else {
            mensagemIndisponivel += `Infelizmente não temos outros horários disponíveis neste dia. Que tal escolher outro dia? 📅`
          }

          return {
            message: mensagemIndisponivel,
            action: "verificar_horario",
            data: { verificacao, dadosAgendamento },
          }
        }
      } else {
        // Perguntar o que falta de forma natural
        const pergunta = this.createNaturalQuestion(dadosAgendamento)
        return { message: pergunta }
      }
    }

    // 2. DETECTAR INTENÇÕES NA MENSAGEM DO USUÁRIO (fallback)

    // Listar serviços
    if (
      lowerMessage.includes("serviços") ||
      lowerMessage.includes("servicos") ||
      lowerMessage.includes("preço") ||
      lowerMessage.includes("preco") ||
      lowerMessage.includes("quanto custa") ||
      lowerMessage.includes("o que vocês fazem") ||
      lowerMessage.includes("que serviços")
    ) {
      console.log(`🎯 [AI-SERVICE] Detectado na mensagem: LISTAR SERVIÇOS`)
      const servicosTexto = this.formatarServicosNatural(context.servicos)
      return { message: servicosTexto, action: "listar_servicos" }
    }

    // Listar horários
    if (
      lowerMessage.includes("horários") ||
      lowerMessage.includes("horarios") ||
      lowerMessage.includes("que horas") ||
      lowerMessage.includes("horário") ||
      lowerMessage.includes("horario") ||
      lowerMessage.includes("disponível")
    ) {
      console.log(`🎯 [AI-SERVICE] Detectado na mensagem: LISTAR HORÁRIOS`)
      const dataExtraida = dadosAgendamento.data || dayjs().format("YYYY-MM-DD")
      const horariosTexto = await this.formatarHorariosDisponiveisViaWebhook(
        dataExtraida,
        context.servicos[0]?.nome || "Corte",
      )
      return { message: horariosTexto, action: "listar_horarios", data: { data: dataExtraida } }
    }

    // Detectar agendamento
    if (
      this.shouldCreateAppointmentDirectly(userMessage, context) ||
      (dadosAgendamento.servico && dadosAgendamento.data && dadosAgendamento.horario)
    ) {
      console.log(`🎯 [AI-SERVICE] Detectado na mensagem: AGENDAMENTO`)

      // Se não temos o nome e não é cliente cadastrado, precisamos perguntar
      if (!dadosAgendamento.nome && !context.cliente) {
        console.log(`❌ [AI-SERVICE] Nome não encontrado e cliente não cadastrado`)
        return {
          message: "Oi! Para fazer seu agendamento, preciso saber seu nome completo, por favor! 😊",
        }
      }

      // Usar nome do cliente cadastrado se não tiver na mensagem
      if (!dadosAgendamento.nome && context.cliente) {
        dadosAgendamento.nome = context.cliente.nome
      }

      if (dadosAgendamento.servico && dadosAgendamento.data && dadosAgendamento.horario) {
        console.log(`⏳ [AI-SERVICE] Verificando disponibilidade via webhook:`, dadosAgendamento)

        // Verificar disponibilidade via webhook
        const verificacao = await this.verificarDisponibilidadeViaWebhook({
          data: dadosAgendamento.data,
          horario: dadosAgendamento.horario,
          servico: dadosAgendamento.servico,
        })

        if (verificacao.disponivel) {
          // Horário disponível, criar agendamento via webhook
          console.log(`✅ [AI-SERVICE] Horário disponível, criando agendamento via webhook`)

          const resultado = await this.criarAgendamentoViaWebhook({
            telefone,
            nome: dadosAgendamento.nome,
            servico: dadosAgendamento.servico,
            data: dadosAgendamento.data,
            horario: dadosAgendamento.horario,
          })

          // Limpar contexto de agendamento após sucesso
          if (resultado.success) {
            delete this.agendamentoContexto[telefone]
          }

          return {
            message: resultado.message,
            action: "agendar_direto",
            data: resultado,
          }
        } else {
          // Horário não disponível, sugerir alternativas
          console.log(`❌ [AI-SERVICE] Horário não disponível:`, verificacao.motivo)

          let mensagemIndisponivel = `Ops! O horário ${dadosAgendamento.horario} do dia ${dayjs(dadosAgendamento.data).format("DD/MM")} não está disponível. 😅\n\n`

          if (verificacao.horariosAlternativos && verificacao.horariosAlternativos.length > 0) {
            mensagemIndisponivel += `**Horários disponíveis para o mesmo dia:**\n`
            verificacao.horariosAlternativos.forEach((horario) => {
              mensagemIndisponivel += `• ${horario}\n`
            })
            mensagemIndisponivel += `\nQual desses horários te atende melhor? 😊`
          } else {
            mensagemIndisponivel += `Infelizmente não temos outros horários disponíveis neste dia. Que tal escolher outro dia? 📅`
          }

          return {
            message: mensagemIndisponivel,
            action: "verificar_horario",
            data: { verificacao, dadosAgendamento },
          }
        }
      } else {
        // Perguntar o que falta de forma natural
        const pergunta = this.createNaturalQuestion(dadosAgendamento)
        return { message: pergunta }
      }
    }

    // Consultar agendamentos
    if (
      context.cliente &&
      (lowerMessage.includes("agendamento") ||
        lowerMessage.includes("consultar") ||
        lowerMessage.includes("meus horários") ||
        lowerMessage.includes("quando tenho"))
    ) {
      console.log(`🎯 [AI-SERVICE] Detectado na mensagem: CONSULTAR AGENDAMENTOS`)
      const agendamentosTexto = this.formatarAgendamentosNatural(context.agendamentos || [])
      return { message: agendamentosTexto, action: "consultar_agendamentos" }
    }

    // 3. Resposta padrão da IA
    console.log(`💬 [AI-SERVICE] Usando resposta padrão da IA`)
    return { message: aiText }
  }

  private atualizarContextoAgendamento(telefone: string, dados: any) {
    // Inicializar contexto se não existir
    if (!this.agendamentoContexto[telefone]) {
      this.agendamentoContexto[telefone] = {
        ultimaAtualizacao: new Date(),
      }
    }

    // Atualizar apenas os campos que foram extraídos
    if (dados.servico) {
      this.agendamentoContexto[telefone].servico = dados.servico
    }

    if (dados.data) {
      this.agendamentoContexto[telefone].data = dados.data
    }

    if (dados.horario) {
      this.agendamentoContexto[telefone].horario = dados.horario
    }

    // Atualizar timestamp
    this.agendamentoContexto[telefone].ultimaAtualizacao = new Date()

    console.log(`🔄 [AI-SERVICE] Contexto de agendamento atualizado:`, this.agendamentoContexto[telefone])
  }

  private combinarDadosComContexto(dadosExtraidos: any, telefone: string) {
    const resultado = { ...dadosExtraidos }

    // Se não temos contexto, retornar apenas os dados extraídos
    if (!this.agendamentoContexto[telefone]) {
      return resultado
    }

    // Combinar com contexto existente
    if (!resultado.servico && this.agendamentoContexto[telefone].servico) {
      resultado.servico = this.agendamentoContexto[telefone].servico
    }

    if (!resultado.data && this.agendamentoContexto[telefone].data) {
      resultado.data = this.agendamentoContexto[telefone].data
    }

    if (!resultado.horario && this.agendamentoContexto[telefone].horario) {
      resultado.horario = this.agendamentoContexto[telefone].horario
    }

    // Verificar se está completo
    resultado.completo = !!(resultado.nome && resultado.servico && resultado.data && resultado.horario)

    return resultado
  }

  private async verificarDisponibilidadeViaWebhook(dados: {
    data: string
    horario: string
    servico: string
  }) {
    try {
      console.log(`🔍 [AI-SERVICE] Verificando disponibilidade via webhook:`, dados)

      const response = await fetch(`${this.baseUrl}/api/webhooks/verificar-disponibilidade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      console.log(`✅ [AI-SERVICE] Verificação concluída:`, result)
      return result
    } catch (error) {
      console.error("💥 [AI-SERVICE] Erro ao verificar disponibilidade:", error)
      return {
        disponivel: false,
        motivo: "Erro interno",
        horariosAlternativos: [],
      }
    }
  }

  private async criarAgendamentoViaWebhook(dados: {
    telefone: string
    nome: string
    servico: string
    data: string
    horario: string
  }) {
    try {
      console.log(`🚀 [AI-SERVICE] Criando agendamento via webhook:`, dados)

      const response = await fetch(`${this.baseUrl}/api/webhooks/criar-agendamento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dados),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      console.log(`✅ [AI-SERVICE] Agendamento criado via webhook:`, result.agendamento?.id)
      return result
    } catch (error) {
      console.error("💥 [AI-SERVICE] Erro ao criar agendamento:", error)
      return {
        success: false,
        message: "Ops! Deu um probleminha aqui. 😅 Pode tentar de novo? Ou me chama que resolvo na hora!",
      }
    }
  }

  private async formatarHorariosDisponiveisViaWebhook(data: string, servico: string): Promise<string> {
    try {
      console.log(`📅 [AI-SERVICE] Formatando horários via webhook para ${data}`)

      const response = await fetch(
        `${this.baseUrl}/api/webhooks/listar-horarios?data=${data}&servico=${encodeURIComponent(servico)}`,
      )
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      const { horariosDisponiveis, periodos, dataFormatada } = result

      if (horariosDisponiveis.length === 0) {
        return `Ops! Não temos horários disponíveis para ${dataFormatada}. 😅\n\nQue tal escolher outro dia? 📅`
      }

      let texto = `📅 **Horários disponíveis para ${dataFormatada}:**\n\n`

      if (periodos.manha.length > 0) {
        texto += `🌅 **Manhã:** ${periodos.manha.join(", ")}\n`
      }

      if (periodos.tarde.length > 0) {
        texto += `🌞 **Tarde:** ${periodos.tarde.join(", ")}\n`
      }

      texto += `\nQual horário prefere? 😊`

      return texto
    } catch (error) {
      console.error("💥 [AI-SERVICE] Erro ao formatar horários:", error)
      return "Ops! Não consegui consultar os horários agora. Tenta de novo? 😅"
    }
  }

  private shouldCreateAppointmentDirectly(message: string, context: AgendamentoContext): boolean {
    const lowerMessage = message.toLowerCase()

    // Palavras que indicam intenção de agendamento
    const agendamentoWords = ["agendar", "marcar", "quero", "gostaria", "preciso", "vou querer", "para"]
    const temIntencao = agendamentoWords.some((word) => lowerMessage.includes(word))

    // Verificar se tem dados suficientes na mensagem ou contexto
    const temServico = context.servicos.some((s) => lowerMessage.includes(s.nome.toLowerCase()))
    const temData = this.extrairData(message) !== null
    const temHorario = /\d{1,2}:?\d{0,2}/.test(message)

    console.log(`🔍 [AI-SERVICE] Análise de agendamento:`, {
      temIntencao,
      temServico,
      temData,
      temHorario,
    })

    return temIntencao && (temServico || temData || temHorario)
  }

  private async extractAppointmentData(message: string, context: AgendamentoContext) {
    const dados = {
      nome: context.cliente?.nome || this.extrairNome(message),
      servico: this.extrairServico(message, context.servicos),
      data: this.extrairData(message),
      horario: this.extrairHorario(message),
      completo: false,
    }

    // Verificar se está completo
    dados.completo = !!(dados.nome && dados.servico && dados.data && dados.horario)

    console.log(`📋 [AI-SERVICE] Dados extraídos:`, dados)
    return dados
  }

  private extrairNome(message: string): string | null {
    // Tentar extrair nome de frases como "meu nome é João", "sou o Pedro", etc.
    const patterns = [
      /(?:meu nome é|me chamo|sou o?a?)\s+([a-záàâãéêíóôõúç\s]+)/i,
      /^([a-záàâãéêíóôõúç]+(?:\s+[a-záàâãéêíóôõúç]+)*)\s+(?:aqui|falando)/i,
      /nome(?:\s+é)?(?:\s+do)?(?:\s+cliente)?(?:\s+)?:?\s+([a-záàâãéêíóôõúç\s]+)/i,
    ]

    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        const nome = match[1].trim()
        // Verificar se o nome tem pelo menos 3 caracteres e não é apenas uma palavra comum
        if (nome.length >= 3 && !["sim", "não", "nao", "ok", "bom", "bem"].includes(nome.toLowerCase())) {
          return nome
        }
      }
    }

    // Tentar extrair um nome próprio da mensagem (primeira palavra com maiúscula)
    const palavras = message.split(/\s+/)
    for (const palavra of palavras) {
      if (palavra.length >= 3 && /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+$/.test(palavra)) {
        return palavra
      }
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
    const match = message.match(regexData)
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
      } catch {
        console.log(`❌ [AI-SERVICE] Data inválida: ${dia}/${mes}`)
        return null
      }
    }

    console.log(`❌ [AI-SERVICE] Nenhuma data encontrada na mensagem`)
    return null
  }

  private extrairHorario(message: string): string | null {
    console.log(`🔍 [AI-SERVICE] Extraindo horário de: "${message}"`)

    // Padrões mais flexíveis para horário
    const patterns = [
      /(\d{1,2}):(\d{2})/, // 14:30
      /(\d{1,2})h(\d{2})/, // 14h30
      /(\d{1,2})h/, // 14h
      /as\s+(\d{1,2})/, // as 14
      /(\d{1,2})\s*horas?/, // 14 horas
    ]

    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match) {
        const hora = match[1]!.padStart(2, "0")
        const minuto = match[2] ? match[2] : "00"
        const horarioFormatado = `${hora}:${minuto}`
        console.log(`✅ [AI-SERVICE] Horário encontrado: ${horarioFormatado}`)
        return horarioFormatado
      }
    }

    console.log(`❌ [AI-SERVICE] Nenhum horário encontrado na mensagem`)
    return null
  }

  private createNaturalQuestion(dados: any): string {
    const faltantes = []

    if (!dados.nome) faltantes.push("seu nome completo")
    if (!dados.servico) faltantes.push("qual serviço você quer")
    if (!dados.data) faltantes.push("que dia prefere")
    if (!dados.horario) faltantes.push("qual horário")

    if (faltantes.length === 1) {
      return `Perfeito! Só preciso saber ${faltantes[0]} pra finalizar seu agendamento. 😊`
    } else {
      return `Ótimo! Pra agendar, preciso saber ${faltantes.slice(0, -1).join(", ")} e ${faltantes[faltantes.length - 1]}. Pode me falar?`
    }
  }

  private formatarServicosNatural(servicos: ServicoConfigurado[]): string {
    if (servicos.length === 0) {
      return "Opa! Nossos serviços principais são corte, barba e corte + barba. Qual te interessa? 😊"
    }

    let texto = "Nossos serviços são:\n\n"
    servicos.forEach((servico, index) => {
      texto += `${index + 1}. **${servico.nome}** - R$ ${servico.preco.toFixed(2)} (${servico.duracaoMinutos} min)\n`
    })
    texto += "\nQual você gostaria de agendar? 💈"
    return texto
  }

  private formatarAgendamentosNatural(agendamentos: any[]): string {
    if (agendamentos.length === 0) {
      return "Você ainda não tem agendamentos comigo. Quer marcar um? 😊"
    }

    let texto = "Seus agendamentos:\n\n"
    agendamentos.forEach((agendamento, index) => {
      const data = dayjs(agendamento.dataHora)
      const status = agendamento.status === "agendado" ? "✅" : agendamento.status === "concluido" ? "✔️" : "❌"
      texto += `${status} **${agendamento.servico}** - ${data.format("DD/MM")} às ${data.format("HH:mm")}\n`
    })

    return texto
  }

  private isPrimeiraMensagemDaConversa(
    telefone: string,
    conversationHistory: Array<{ role: string; content: string }>,
  ): boolean {
    // Se já fizemos a saudação para este telefone, não é primeira mensagem
    if (this.saudacoesFeitas.has(telefone)) {
      return false
    }

    // Se não há histórico ou há apenas 1 mensagem (a atual), é primeira mensagem
    return conversationHistory.length <= 1
  }

  private async criarSaudacaoPersonalizada(cliente: any, mensagemUsuario: string): Promise<string | null> {
    try {
      console.log(`👋 [AI-SERVICE] Criando saudação personalizada para:`, cliente?.nome || "cliente não cadastrado")

      // Determinar o tipo de saudação baseado na mensagem do usuário
      const tipoSaudacao = this.determinarTipoSaudacao(mensagemUsuario)

      if (cliente && cliente.nome) {
        // Cliente cadastrado - usar primeiro nome
        const primeiroNome = this.extrairPrimeiroNome(cliente.nome)
        console.log(`✅ [AI-SERVICE] Cliente cadastrado: ${cliente.nome} -> Primeiro nome: ${primeiroNome}`)

        return this.gerarSaudacaoComNome(primeiroNome, tipoSaudacao, mensagemUsuario)
      } else {
        // Cliente não cadastrado - saudação genérica
        console.log(`🆕 [AI-SERVICE] Cliente não cadastrado - saudação genérica`)

        return this.gerarSaudacaoGenerica(tipoSaudacao, mensagemUsuario)
      }
    } catch (error) {
      console.error("💥 [AI-SERVICE] Erro ao criar saudação personalizada:", error)
      return null
    }
  }

  private extrairPrimeiroNome(nomeCompleto: string): string {
    // Extrair apenas o primeiro nome
    const nomes = nomeCompleto.trim().split(/\s+/)
    const primeiroNome = nomes[0] || nomeCompleto

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

  private gerarSaudacaoComNome(primeiroNome: string, tipo: string, mensagemOriginal: string): string {
    const saudacoes = {
      formal: [
        `Olá ${primeiroNome}! Tudo bem? 😊`,
        `Oi ${primeiroNome}! Como você está?`,
        `${primeiroNome}! Que bom te ver por aqui! 😊`,
      ],
      casual: [
        `E aí ${primeiroNome}! Tudo certo? 😄`,
        `Opa ${primeiroNome}! Beleza?`,
        `Olá ${primeiroNome}! Tudo bem? 😊`,
      ],
      urgente: [`Oi ${primeiroNome}! Vou te ajudar rapidinho! 🚀`, `${primeiroNome}! Estou aqui pra te atender! 😊`],
      servico: [
        `Olá ${primeiroNome}! Vamos agendar seu horário? 💈`,
        `Oi ${primeiroNome}! Que bom que você voltou! 😊`,
      ],
    }

    const opcoes = saudacoes[tipo] || saudacoes.casual
    const saudacaoEscolhida = opcoes[Math.floor(Math.random() * opcoes.length)]

    // Adicionar pergunta contextual baseada na mensagem
    let perguntaContextual = ""

    if (tipo === "servico") {
      perguntaContextual = " O que você gostaria de agendar hoje?"
    } else if (tipo === "urgente") {
      perguntaContextual = " Em que posso te ajudar?"
    } else {
      perguntaContextual = " Como posso te ajudar hoje?"
    }

    return saudacaoEscolhida + perguntaContextual
  }

  private gerarSaudacaoGenerica(tipo: string, mensagemOriginal: string): string {
    const saudacoes = {
      formal: [`Olá! Tudo bem? 😊`, `Oi! Como você está?`, `Olá! Que bom ter você aqui! 😊`],
      casual: [`E aí! Tudo certo? 😄`, `Opa! Beleza?`, `Olá! Tudo bem? 😊`],
      urgente: [`Oi! Vou te ajudar rapidinho! 🚀`, `Olá! Estou aqui pra te atender! 😊`],
      servico: [`Olá! Vamos agendar seu horário? 💈`, `Oi! Bem-vindo à nossa barbearia! 😊`],
    }

    const opcoes = saudacoes[tipo] || saudacoes.casual
    const saudacaoEscolhida = opcoes[Math.floor(Math.random() * opcoes.length)]

    // Adicionar pergunta contextual
    let perguntaContextual = ""

    if (tipo === "servico") {
      perguntaContextual = " O que você gostaria de agendar hoje?"
    } else if (tipo === "urgente") {
      perguntaContextual = " Em que posso te ajudar?"
    } else {
      // Para clientes novos, perguntar o nome
      perguntaContextual = " Para começar, qual é o seu nome?"
    }

    return saudacaoEscolhida + perguntaContextual
  }
}

export const aiService = new AIService()
