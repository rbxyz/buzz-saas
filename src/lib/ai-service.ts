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
  | "consultar_empresa"
  | "verificar_funcionamento"
  | "buscar_endereco"
  | "encaminhar_humano"
  data?: unknown
}

interface DadosAgendamentoExtraidos {
  nome?: string
  servico?: string
  data?: string
  horario?: string
  telefone?: string
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
    const { configuracao, servicos, cliente, agendamentos, agendamentoEmAndamento } = context

    const nomeEmpresa = configuracao?.nomeEmpresa ?? "nossa barbearia"
    const telefoneEmpresa = configuracao?.telefone ?? ""
    const enderecoEmpresa = configuracao?.endereco ?? ""

    // Formatar serviços disponíveis
    const servicosTexto = servicos.length > 0
      ? servicos.map(s => `• ${s.nome}: R$ ${s.preco.toFixed(2)} (${s.duracaoMinutos} min)`).join('\n')
      : "• Corte de cabelo masculino\n• Barba\n• Corte + Barba"

    // Informações do cliente atual
    const infoCliente = cliente
      ? `CLIENTE ATUAL: ${cliente.nome} (Telefone: ${cliente.telefone}${cliente.email ? `, Email: ${cliente.email}` : ''})`
      : "Cliente não cadastrado - precisará criar cadastro para agendar"

    // Histórico de agendamentos do cliente
    const historicoAgendamentos = agendamentos && agendamentos.length > 0
      ? `HISTÓRICO: ${agendamentos.slice(0, 3).map(a =>
        `${dayjs(a.dataHora).format('DD/MM/YYYY HH:mm')} - ${a.servico} (${a.status})`
      ).join(', ')}`
      : "Primeiro agendamento do cliente"

    // Contexto de agendamento em andamento
    const contextoAgendamento = agendamentoEmAndamento
      ? `AGENDAMENTO EM ANDAMENTO: ${JSON.stringify(agendamentoEmAndamento)}`
      : "Nenhum agendamento em andamento"

    const prompt = `# ASSISTENTE VIRTUAL DA BARBEARIA - ${nomeEmpresa.toUpperCase()}

## IDENTIDADE E PERSONALIDADE
Você é o assistente virtual oficial da ${nomeEmpresa}. Seja sempre:
- **Profissional mas amigável** - use linguagem natural brasileira
- **Eficiente** - vá direto ao ponto sem enrolação
- **Prestativo** - sempre tente resolver o problema do cliente
- **Paciente** - explique quantas vezes for necessário
- **Confiável** - nunca invente informações que não tem

## INFORMAÇÕES DA EMPRESA
- **Nome**: ${nomeEmpresa}
- **Telefone**: ${telefoneEmpresa || 'Consulte diretamente na barbearia'}
- **Endereço**: ${enderecoEmpresa || 'Consulte diretamente na barbearia'}

## SERVIÇOS DISPONÍVEIS
${servicosTexto}

## CONTEXTO ATUAL
${infoCliente}
${historicoAgendamentos}
${contextoAgendamento}

## REGRAS CRÍTICAS - NUNCA QUEBRE ESTAS REGRAS

### 1. VERIFICAÇÃO OBRIGATÓRIA DE HORÁRIOS
- **SEMPRE** use a action 'verificar_horario' antes de confirmar qualquer agendamento
- **NUNCA** confirme disponibilidade sem consultar o sistema
- A disponibilidade muda constantemente e você não tem acesso direto

### 2. INFORMAÇÕES VERDADEIRAS APENAS
- **APENAS** forneça informações que estão no contexto ou obtidas via webhooks
- **NUNCA** invente horários de funcionamento, preços ou serviços
- Para informações não disponíveis, diga: "Vou consultar isso para você" e use webhooks

### 3. FLUXO DE AGENDAMENTO OBRIGATÓRIO
Para agendar, você PRECISA ter:
1. **Nome completo** (use 'criar_cliente' se necessário)
2. **Serviço desejado** (use 'listar_servicos' se cliente pedir)
3. **Data preferida** (formato DD/MM ou "hoje", "amanhã")
4. **Horário preferido** (formato HH:MM ou "manhã", "tarde")
5. **Verificação de disponibilidade** (sempre usar 'verificar_horario')
6. **Confirmação final** (usar 'agendar_direto' após verificação)

### 4. ACTIONS DISPONÍVEIS - USE QUANDO NECESSÁRIO
- \`verificar_horario\`: Para verificar se horário está disponível
- \`listar_servicos\`: Quando cliente pedir lista de serviços
- \`listar_horarios\`: Para mostrar horários disponíveis em uma data
- \`criar_cliente\`: Para cadastrar novo cliente
- \`agendar_direto\`: APENAS após verificar_horario confirmar disponibilidade
- \`consultar_agendamentos\`: Para mostrar agendamentos do cliente
- \`cancelar\`: Para cancelar agendamento (encaminhar para atendimento humano)
- \`reagendar\`: Para reagendar (encaminhar para atendimento humano)

### 5. RESPOSTAS EM JSON QUANDO USAR ACTIONS
Quando precisar usar uma action, responda no formato:
\`\`\`json
{
  "action": "nome_da_action",
  "data": { "campo": "valor" }
}
\`\`\`

### 6. TRATAMENTO DE DÚVIDAS COMUNS
- **Horário de funcionamento**: "Vou verificar nossos horários de funcionamento para você"
- **Localização**: Use o endereço fornecido ou peça para consultar
- **Preços**: Use apenas os preços dos serviços no contexto
- **Cancelamentos**: "Para cancelar, vou conectar você com nossa equipe"

### 7. LIMITAÇÕES E ENCAMINHAMENTOS
Para estas situações, SEMPRE encaminhe para atendimento humano:
- Reclamações ou problemas
- Cancelamentos urgentes
- Reagendamentos complexos
- Dúvidas sobre produtos
- Solicitações especiais
- Problemas de cobrança

## EXEMPLOS DE INTERAÇÕES

**Cliente pede agendamento:**
"Ótimo! Vou te ajudar a agendar. Preciso saber: que serviço você quer, que dia prefere e qual horário?"

**Cliente pergunta preços:**
"Nossos preços são: [listar apenas os do contexto]. Qual serviço te interessa?"

**Cliente quer cancelar:**
"Entendo que precisa cancelar. Vou conectar você com nossa equipe para resolver isso rapidinho."

**Não sei uma informação:**
"Deixa eu consultar essa informação para você!" [usar webhook apropriado]

## PERSONALIZAÇÃO POR TIPO DE MENSAGEM

### Cliente novo:
- Seja mais explicativo sobre o processo
- Ofereça ajuda para entender os serviços
- Explique como funciona o agendamento

### Cliente recorrente:
- Seja mais direto
- Lembre do histórico se disponível
- Ofereça serviços similares aos anteriores

### Urgência:
- Vá direto ao ponto
- Priorize eficiência
- Ofereça horários mais próximos

## LINGUAGEM E TOM
- Use português brasileiro natural
- Evite ser muito formal ou robótico
- Use emojis moderadamente (💈 ✅ 😊)
- Seja claro e conciso
- Confirme informações importantes

## JAMAIS FAÇA
❌ Inventar horários de funcionamento
❌ Confirmar agendamento sem verificar disponibilidade
❌ Dar informações sobre promoções não mencionadas
❌ Prometer serviços não disponíveis
❌ Fornecer informações de outros clientes
❌ Falar mal da concorrência
❌ Dar conselhos médicos ou estéticos

Lembre-se: Sua função é agendar horários e fornecer informações precisas. Quando em dúvida, consulte via webhooks ou encaminhe para atendimento humano.`

    return prompt
  }

  private async parseAndProcessResponse(
    aiText: string,
    userMessage: string,
    telefone: string,
    context: AgendamentoContext,
  ): Promise<AIResponse> {
    try {
      console.log(`🧠 [AI-SERVICE] Analisando resposta da IA: ${aiText.substring(0, 200)}...`)

      // Tentar extrair um objeto JSON de dentro do texto da IA
      const jsonMatch = /```json\s*([\s\S]*?)\s*```/.exec(aiText)
      if (jsonMatch?.[1]) {
        const jsonString = jsonMatch[1]
        let parsedJson: AIResponse

        try {
          parsedJson = JSON.parse(jsonString) as AIResponse
        } catch (parseError) {
          console.error(`❌ [AI-SERVICE] Erro ao fazer parse do JSON:`, parseError)
          return { message: "Tive um problema ao processar sua solicitação. Pode repetir?" }
        }

        const { action, data } = parsedJson

        console.log(`🎬 [AI-SERVICE] Ação extraída: ${action}`)

        // Validar e processar a ação
        switch (action) {
          case "verificar_horario": {
            return await this.processVerificarHorario(data, telefone, context)
          }

          case "agendar_direto": {
            return await this.processAgendarDireto(data, telefone, context, userMessage)
          }

          case "criar_cliente": {
            return await this.processCriarCliente(data, telefone, context, userMessage)
          }

          case "listar_servicos": {
            return {
              message: this.formatarServicosNatural(context.servicos),
              action: undefined // Remove action para não processar novamente
            }
          }

          case "consultar_agendamentos": {
            return { message: this.formatarAgendamentosNatural(context.agendamentos ?? []) }
          }

          case "listar_horarios": {
            return await this.processListarHorarios(data, telefone)
          }

          case "consultar_empresa": {
            return await this.processConsultarEmpresa(context)
          }

          case "verificar_funcionamento": {
            return await this.processVerificarFuncionamento()
          }

          case "buscar_endereco": {
            return await this.processBuscarEndereco(context)
          }

          case "encaminhar_humano": {
            return await this.processEncaminharHumano(data, telefone)
          }

          case "cancelar":
          case "reagendar":
            return await this.processEncaminharHumano({ motivo: action, detalhes: data }, telefone)

          default:
            console.log(`❓ [AI-SERVICE] Ação desconhecida: ${action}`)
            return { message: "Não entendi o que você precisa. Pode explicar de novo?" }
        }
      }

      // Se não encontrou JSON ou ação válida, mas o texto contém informações úteis
      const textoLimpo = aiText.replace(/```json[\s\S]*?```/g, "").trim()

      if (textoLimpo.length > 0) {
        // Verificar se o texto contém informações potencialmente falsas ou inventadas
        if (this.detectarInformacoesFalsas(textoLimpo)) {
          console.warn(`⚠️ [AI-SERVICE] Possível informação falsa detectada: ${textoLimpo.substring(0, 100)}`)
          return {
            message: "Deixa eu consultar essa informação para ter certeza! Um momento...",
            action: "consultar_empresa"
          }
        }

        return { message: textoLimpo }
      }

      return { message: "Não entendi bem. Pode repetir o que você precisa?" }

    } catch (error) {
      console.error("💥 [AI-SERVICE] Erro ao analisar resposta da IA:", error)
      return { message: "Tive um problema ao processar sua resposta. Pode tentar novamente?" }
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
    console.log(`🔍 [AI-SERVICE] Extraindo nome de: "${message}"`)

    // Padrões mais robustos para capturar nomes
    const patterns = [
      /(?:meu nome é|me chamo|sou o|sou a|pode registrar como|pode anotar como)\s+([A-Za-zÀ-ÿ\s]{2,50})/i,
      /(?:nome:|nome)\s+([A-Za-zÀ-ÿ\s]{2,50})/i,
      /^([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)+)$/i // Nome completo direto
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(message)
      if (match?.[1]) {
        const nome = match[1].trim()

        // Validações básicas
        if (nome.length < 2 || nome.length > 50) continue
        if (!/^[A-Za-zÀ-ÿ\s]+$/.test(nome)) continue // Apenas letras e espaços
        if (nome.split(' ').length < 2) continue // Pelo menos nome e sobrenome

        const nomeFormatado = nome
          .split(' ')
          .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
          .join(' ')

        console.log(`✅ [AI-SERVICE] Nome extraído: ${nomeFormatado}`)
        return nomeFormatado
      }
    }

    console.log(`❌ [AI-SERVICE] Nenhum nome válido encontrado`)
    return null
  }

  private extrairServico(message: string, servicos: ServicoConfigurado[]): string | null {
    const lowerMessage = message.toLowerCase()

    console.log(`🔍 [AI-SERVICE] Extraindo serviço de: "${message}"`)
    console.log(`🔍 [AI-SERVICE] Serviços disponíveis:`, servicos.map(s => s.nome))

    // Primeiro, tentar match exato
    for (const servico of servicos) {
      if (lowerMessage.includes(servico.nome.toLowerCase())) {
        console.log(`✅ [AI-SERVICE] Serviço encontrado (match exato): ${servico.nome}`)
        return servico.nome
      }
    }

    // Mapeamento de palavras-chave para tipos de serviço
    const palavrasChave = {
      corte: ['corte', 'cabelo', 'cortei', 'cortar', 'aparar'],
      barba: ['barba', 'barbeado', 'barbear', 'bigode'],
      'corte + barba': ['completo', 'tudo', 'corte e barba', 'corte + barba', 'cabelo e barba'],
      sobrancelha: ['sobrancelha', 'sombrancelha', 'cílios'],
      hidratacao: ['hidratação', 'hidratacao', 'tratamento'],
      lavagem: ['lavagem', 'lavar', 'shampoo']
    }

    // Procurar por palavras-chave
    for (const [tipo, palavras] of Object.entries(palavrasChave)) {
      if (palavras.some(palavra => lowerMessage.includes(palavra))) {
        // Encontrar serviço correspondente
        const servicoEncontrado = servicos.find(s =>
          s.nome.toLowerCase().includes(tipo.toLowerCase()) ||
          palavras.some(p => s.nome.toLowerCase().includes(p))
        )

        if (servicoEncontrado) {
          console.log(`✅ [AI-SERVICE] Serviço encontrado (palavra-chave): ${servicoEncontrado.nome}`)
          return servicoEncontrado.nome
        }
      }
    }

    console.log(`❌ [AI-SERVICE] Nenhum serviço encontrado na mensagem`)
    return null
  }

  private extrairData(message: string): string | null {
    const hoje = dayjs()
    const lowerMessage = message.toLowerCase()

    console.log(`🔍 [AI-SERVICE] Extraindo data de: "${message}"`)

    // Palavras-chave para datas relativas
    if (lowerMessage.includes('hoje')) {
      console.log(`✅ [AI-SERVICE] Data encontrada: hoje (${hoje.format('DD/MM/YYYY')})`)
      return hoje.format('YYYY-MM-DD')
    }

    if (lowerMessage.includes('amanhã') || lowerMessage.includes('amanha')) {
      const amanha = hoje.add(1, 'day')
      console.log(`✅ [AI-SERVICE] Data encontrada: amanhã (${amanha.format('DD/MM/YYYY')})`)
      return amanha.format('YYYY-MM-DD')
    }

    if (lowerMessage.includes('depois de amanhã') || lowerMessage.includes('depois de amanha')) {
      const depoisAmanha = hoje.add(2, 'day')
      console.log(`✅ [AI-SERVICE] Data encontrada: depois de amanhã (${depoisAmanha.format('DD/MM/YYYY')})`)
      return depoisAmanha.format('YYYY-MM-DD')
    }

    // Dias da semana
    const diasSemana = {
      'segunda': 1, 'segunda-feira': 1,
      'terça': 2, 'terca': 2, 'terça-feira': 2, 'terca-feira': 2,
      'quarta': 3, 'quarta-feira': 3,
      'quinta': 4, 'quinta-feira': 4,
      'sexta': 5, 'sexta-feira': 5,
      'sábado': 6, 'sabado': 6,
      'domingo': 0
    }

    for (const [dia, num] of Object.entries(diasSemana)) {
      if (lowerMessage.includes(dia)) {
        const proximoDia = hoje.day(num)
        if (proximoDia.isBefore(hoje) || proximoDia.isSame(hoje, 'day')) {
          proximoDia.add(1, 'week')
        }
        console.log(`✅ [AI-SERVICE] Data encontrada: ${dia} (${proximoDia.format('DD/MM/YYYY')})`)
        return proximoDia.format('YYYY-MM-DD')
      }
    }

    // Formatos de data: DD/MM, DD-MM, DD.MM
    const regexData = /(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/
    const match = regexData.exec(message)
    if (match) {
      const dia = parseInt(match[1]!)
      const mes = parseInt(match[2]!)
      const ano = match[3] ? parseInt(match[3]) : hoje.year()

      // Ajustar ano se for formato de 2 dígitos
      const anoCompleto = ano < 100 ? 2000 + ano : ano

      try {
        const data = dayjs(`${anoCompleto}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`)

        if (data.isValid() && data.isAfter(hoje.subtract(1, 'day')) && data.isBefore(hoje.add(3, 'month'))) {
          console.log(`✅ [AI-SERVICE] Data encontrada: ${data.format('DD/MM/YYYY')}`)
          return data.format('YYYY-MM-DD')
        }
      } catch {
        console.log(`❌ [AI-SERVICE] Data inválida: ${dia}/${mes}/${anoCompleto}`)
      }
    }

    console.log(`❌ [AI-SERVICE] Nenhuma data válida encontrada`)
    return null
  }

  private extrairHorario(message: string): string | null {
    const lowerMessage = message.toLowerCase()

    console.log(`🔍 [AI-SERVICE] Extraindo horário de: "${message}"`)

    // Períodos genéricos
    if (lowerMessage.includes('manhã')) {
      console.log(`✅ [AI-SERVICE] Período encontrado: manhã`)
      return '09:00' // Horário padrão da manhã
    }
    if (lowerMessage.includes('tarde')) {
      console.log(`✅ [AI-SERVICE] Período encontrado: tarde`)
      return '14:00' // Horário padrão da tarde
    }
    if (lowerMessage.includes('noite')) {
      console.log(`✅ [AI-SERVICE] Período encontrado: noite`)
      return '18:00' // Horário padrão da noite
    }

    // Formatos de horário: HH:MM, HH.MM, HHhMM, HH h MM
    const regexHorario = /(\d{1,2})[:\.h](\d{2})|(\d{1,2})\s*h\s*(\d{2})?|(\d{1,2})\s+e\s+(\d{2})/i
    const match = regexHorario.exec(message)

    if (match) {
      const hora = parseInt(match[1] ?? match[3] ?? match[5] ?? '0')
      const minuto = parseInt(match[2] ?? match[4] ?? match[6] ?? '0')

      // Validar horário
      if (hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59) {
        const horarioFormatado = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`
        console.log(`✅ [AI-SERVICE] Horário encontrado: ${horarioFormatado}`)
        return horarioFormatado
      }
    }

    // Horários por extenso
    const horariosExtenso = {
      'oito': '08:00', 'nove': '09:00', 'dez': '10:00', 'onze': '11:00',
      'meio-dia': '12:00', 'meio dia': '12:00',
      'uma': '13:00', 'duas': '14:00', 'três': '15:00', 'tres': '15:00',
      'quatro': '16:00', 'cinco': '17:00', 'seis': '18:00', 'sete': '19:00'
    }

    for (const [extenso, horario] of Object.entries(horariosExtenso)) {
      if (lowerMessage.includes(extenso)) {
        console.log(`✅ [AI-SERVICE] Horário por extenso encontrado: ${horario}`)
        return horario
      }
    }

    console.log(`❌ [AI-SERVICE] Nenhum horário encontrado`)
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
      return "🔧 Ops! Nossos serviços estão sendo atualizados no sistema. Por favor, entre em contato diretamente para consultar nossos serviços disponíveis! 💈"
    }

    let texto = "💈 **Nossos serviços:**\n\n"
    servicos.forEach((servico, index) => {
      const emoji = index === 0 ? "✂️" : index === 1 ? "🪒" : "💫"
      texto += `${emoji} **${servico.nome}**\n`
      texto += `   💰 R$ ${servico.preco.toFixed(2).replace('.', ',')}\n`
      texto += `   ⏱️ ${servico.duracaoMinutos} minutos\n\n`
    })
    texto += "Qual serviço te interessa? 😊"
    return texto
  }

  private formatarAgendamentosNatural(agendamentos: Agendamentos[]): string {
    if (agendamentos.length === 0) {
      return "📅 Você ainda não tem nenhum agendamento conosco.\n\nQue tal marcar seu primeiro horário? Vou te ajudar! 💈"
    }

    let texto = "📅 **Seus agendamentos:**\n\n"

    // Separar agendamentos por status
    const agendamentosAtivos = agendamentos.filter(a => a.status === 'confirmado' || a.status === 'agendado')
    const agendamentosPassados = agendamentos.filter(a => a.status === 'concluido')

    if (agendamentosAtivos.length > 0) {
      texto += "🟢 **Próximos agendamentos:**\n"
      agendamentosAtivos.slice(0, 3).forEach(agendamento => {
        const data = dayjs(agendamento.dataHora)
        const status = agendamento.status === 'confirmado' ? '✅' : '🕐'
        texto += `${status} ${agendamento.servico}\n`
        texto += `   📅 ${data.format('DD/MM/YYYY')} às ${data.format('HH:mm')}\n`
        if (agendamento.valorCobrado) {
          const valor = Number(agendamento.valorCobrado)
          if (!isNaN(valor)) {
            texto += `   💰 R$ ${valor.toFixed(2).replace('.', ',')}\n`
          }
        }
        texto += "\n"
      })
    }

    if (agendamentosPassados.length > 0) {
      texto += "\n📚 **Histórico recente:**\n"
      agendamentosPassados.slice(0, 2).forEach(agendamento => {
        const data = dayjs(agendamento.dataHora)
        texto += `✅ ${agendamento.servico} - ${data.format('DD/MM/YYYY')}\n`
      })
    }

    texto += "\n💬 Precisa reagendar ou cancelar algum? É só me falar!"
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

  // ===== NOVOS MÉTODOS DE PROCESSAMENTO =====

  private async processVerificarHorario(
    data: unknown,
    telefone: string,
    _context: AgendamentoContext
  ): Promise<AIResponse> {
    try {
      const { servico, data: dataAg, horario } = data as { servico: string; data: string; horario: string }
      const dadosVerificar = this.combinarDadosComContexto({ servico, data: dataAg, horario }, telefone)
      const disponibilidade = await this.verificarDisponibilidadeViaWebhook(dadosVerificar)

      this.atualizarContextoAgendamento(telefone, dadosVerificar)

      if (disponibilidade.disponivel) {
        return {
          message: `✅ Perfeito! O horário das ${horario} de ${dayjs(dataAg).format("DD/MM")} está disponível para ${servico}. Posso confirmar o agendamento?`,
          action: "agendar_direto",
          data: dadosVerificar,
        }
      } else {
        let resposta = `❌ O horário das ${horario} de ${dayjs(dataAg).format("DD/MM")} não está mais disponível. ${disponibilidade.motivo ?? ""}`
        if (disponibilidade.horariosAlternativos?.length) {
          resposta += `\n\n💡 Que tal um desses horários próximos:\n${disponibilidade.horariosAlternativos.map(h => `• ${h}`).join('\n')}`
        }
        return { message: resposta }
      }
    } catch (error) {
      console.error("Erro ao verificar horário:", error)
      return { message: "Tive um problema ao verificar a disponibilidade. Pode tentar novamente?" }
    }
  }

  private async processAgendarDireto(
    data: unknown,
    telefone: string,
    context: AgendamentoContext,
    _userMessage: string
  ): Promise<AIResponse> {
    try {
      const dadosAgendamento = this.combinarDadosComContexto(data as DadosAgendamentoExtraidos, telefone)

      if (!context.cliente?.nome && !dadosAgendamento.nome) {
        this.atualizarContextoAgendamento(telefone, dadosAgendamento)
        return {
          message: "Perfeito! Para finalizar o agendamento, só preciso do seu nome completo. Pode me dizer?",
          action: "criar_cliente",
          data: dadosAgendamento,
        }
      }

      dadosAgendamento.nome = dadosAgendamento.nome ?? context.cliente?.nome

      const dadosCompletos = {
        ...dadosAgendamento,
        telefone: telefone
      }

      const resultado = await this.criarAgendamentoViaWebhook(dadosCompletos)
      if (resultado.success) {
        delete this.agendamentoContexto[telefone] // Limpa o contexto após sucesso
        return {
          message: `🎉 ${resultado.message ?? "Agendamento confirmado com sucesso!"}\n\nEm caso de imprevisto, entre em contato conosco. Até lá! 💈`
        }
      } else {
        return {
          message: `❌ ${resultado.message ?? "Não foi possível confirmar o agendamento."}\n\nVamos tentar novamente ou prefere falar com nossa equipe?`
        }
      }
    } catch (error) {
      console.error("Erro ao agendar direto:", error)
      return { message: "Tive um problema ao confirmar o agendamento. Vou conectar você com nossa equipe." }
    }
  }

  private async processCriarCliente(
    data: unknown,
    telefone: string,
    context: AgendamentoContext,
    userMessage: string
  ): Promise<AIResponse> {
    try {
      const dadosCliente = this.combinarDadosComContexto(data as DadosAgendamentoExtraidos, telefone)
      this.atualizarContextoAgendamento(telefone, dadosCliente)

      const nomeExtraido = this.extrairNome(userMessage)
      if (nomeExtraido) {
        const resultado = await this.criarClienteViaWebhook(telefone, nomeExtraido)
        if (resultado.success && resultado.cliente) {
          const novoContexto = { ...dadosCliente, nome: resultado.cliente.nome }

          // Se já temos todos os dados, tenta agendar direto
          if (novoContexto.servico && novoContexto.data && novoContexto.horario) {
            return this.processAgendarDireto(novoContexto, telefone, context, userMessage)
          }

          const primeiroNome = nomeExtraido.split(" ")[0]
          return {
            message: `Prazer em conhecer você, ${primeiroNome}! 😊 Seu cadastro foi criado com sucesso.\n\nAgora me conta: que serviço você gostaria e qual dia/horário prefere?`,
          }
        }
      }
      return {
        message: "Não consegui entender seu nome. Pode me dizer seu nome completo, por favor?",
        action: "criar_cliente",
        data: dadosCliente,
      }
    } catch (error) {
      console.error("Erro ao criar cliente:", error)
      return { message: "Tive um problema ao criar seu cadastro. Pode tentar novamente com seu nome completo?" }
    }
  }

  private async processListarHorarios(data: unknown, telefone: string): Promise<AIResponse> {
    try {
      const { data: dataAg, servico } = data as { data: string; servico: string }
      const horariosDisponiveis = await this.formatarHorariosDisponiveisViaWebhook(dataAg, servico)
      this.atualizarContextoAgendamento(telefone, { data: dataAg, servico })
      return { message: horariosDisponiveis }
    } catch (error) {
      console.error("Erro ao listar horários:", error)
      return { message: "Tive um problema ao consultar os horários. Pode me dizer que dia prefere?" }
    }
  }

  private async processConsultarEmpresa(context: AgendamentoContext): Promise<AIResponse> {
    const { configuracao } = context

    let infoEmpresa = `📍 **Informações da ${configuracao?.nomeEmpresa ?? 'barbearia'}:**\n\n`

    if (configuracao?.telefone) {
      infoEmpresa += `📞 **Telefone:** ${configuracao.telefone}\n`
    }

    if (configuracao?.endereco) {
      infoEmpresa += `🏢 **Endereço:** ${configuracao.endereco}\n`
    }

    if (context.servicos.length > 0) {
      infoEmpresa += `\n💈 **Nossos serviços:**\n`
      infoEmpresa += context.servicos.map(s =>
        `• ${s.nome} - R$ ${s.preco.toFixed(2)} (${s.duracaoMinutos} min)`
      ).join('\n')
    }

    if (!configuracao?.telefone && !configuracao?.endereco) {
      infoEmpresa += `Para mais informações sobre localização e contato, entre em contato diretamente conosco.`
    }

    return { message: infoEmpresa }
  }

  private async processVerificarFuncionamento(): Promise<AIResponse> {
    // Aqui poderia consultar um webhook específico para horários de funcionamento
    // Por enquanto, retorna uma resposta padrão
    return {
      message: "Para consultar nossos horários de funcionamento, por favor entre em contato diretamente conosco. Nossos horários podem variar conforme o dia da semana."
    }
  }

  private async processBuscarEndereco(context: AgendamentoContext): Promise<AIResponse> {
    const { configuracao } = context

    if (configuracao?.endereco) {
      return {
        message: `📍 **Nossa localização:**\n${configuracao.endereco}\n\nPrecisa de mais alguma informação sobre como chegar?`
      }
    }

    return {
      message: "Para informações sobre nossa localização, entre em contato diretamente conosco que te passamos todos os detalhes!"
    }
  }

  private async processEncaminharHumano(data: unknown, telefone: string): Promise<AIResponse> {
    const { motivo } = data as { motivo?: string; detalhes?: unknown }

    console.log(`👤 [AI-SERVICE] Encaminhando para humano - Telefone: ${telefone}, Motivo: ${motivo}`)

    let mensagem = "Entendi que você precisa de um atendimento mais especializado. "

    switch (motivo) {
      case "cancelar":
        mensagem += "Para cancelar seu agendamento, nossa equipe vai te ajudar rapidinho."
        break
      case "reagendar":
        mensagem += "Para reagendar, vou conectar você com nossa equipe."
        break
      case "reclamacao":
        mensagem += "Sua opinião é muito importante para nós. Nossa equipe vai entrar em contato."
        break
      case "problema":
        mensagem += "Vamos resolver seu problema o mais rápido possível."
        break
      default:
        mensagem += "Nossa equipe especializada vai te atender."
    }

    mensagem += "\n\n🕐 Aguarde um momento que já vou conectar você com uma pessoa da nossa equipe!"

    return { message: mensagem }
  }

  private detectarInformacoesFalsas(texto: string): boolean {
    const texto_lower = texto.toLowerCase()

    // Palavras-chave que podem indicar informações inventadas
    const palavrasRisco = [
      'horário de funcionamento',
      'funcionamos das',
      'abrimos às',
      'fechamos às',
      'segunda à sexta',
      'fins de semana',
      'feriados',
      'promocão',
      'desconto',
      'preço especial',
      'valor promocional',
      'grátis',
      'cortesia'
    ]

    return palavrasRisco.some(palavra => texto_lower.includes(palavra))
  }
}

export const aiService = new AIService()
