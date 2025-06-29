/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/prefer-regexp-exec */

import { generateText, type CoreMessage } from "ai"
import { groq } from "@ai-sdk/groq"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import weekday from "dayjs/plugin/weekday"
import isoWeek from "dayjs/plugin/isoWeek"
import "dayjs/locale/pt-br"
// Imports removidos pois não são mais usados diretamente
// import {
//   listarServicosDisponiveis,
//   listarHorariosDisponiveis,
//   criarAgendamento,
//   criarCliente,
// } from "@/lib/actions"
import { db } from "@/server/db"
import { intervalosTrabalho, conversations, servicos } from "@/server/db/schema"
import { eq } from "drizzle-orm"

// Configurar plugins do dayjs
dayjs.extend(customParseFormat)
dayjs.extend(weekday)
dayjs.extend(isoWeek)
dayjs.locale('pt-br')

const model = groq("gemma2-9b-it")
// qwen-qwq-32b
// gemma2-9b-it
interface AIResponse {
  message: string
}

type ConversationMessage = CoreMessage

// Interface para memória do usuário (agora será persistida no banco)
interface UserMemory {
  nomeCliente?: string
  telefone: string
  servicoInteresse?: string
  dataDesejada?: string
  horarioDesejado?: string
  etapaAgendamento: 'inicial' | 'coletando_info' | 'confirmando' | 'concluido'
  ultimaInteracao: Date
  resumoConversa?: string
}

interface BusinessContext {
  servicos: Array<{
    nome: string
    descricao: string | null
    preco: string | null
    duracao: number
  }>
  horarios: Array<{
    id: number
    userId: number
    diaSemana: number
    horaInicio: string
    horaFim: string
    ativo: boolean
  }>
  servicosFormatados: string
  horariosFormatados: string
  diasFuncionamento: string[]
}

class AIService {
  private currentContext: BusinessContext | undefined

  private async getBusinessContext(): Promise<BusinessContext> {
    // Buscar dados sempre via webhook interno para evitar divergência
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    let servicosDisponiveis: Array<{ nome: string; descricao: string | null; preco: string | null; duracao: number }> = []

    try {
      const resp = await fetch(`${baseUrl}/api/webhooks/listar-servicos`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })

      if (resp.ok && resp.headers.get("content-type")?.includes("application/json")) {
        const json = await resp.json() as { success: boolean; servicos: { nome: string; preco: number; duracaoMinutos: number }[] }

        if (json.success) {
          servicosDisponiveis = json.servicos.map((s) => ({
            nome: s.nome,
            descricao: null,
            preco: s.preco.toFixed(2),
            duracao: s.duracaoMinutos,
          }))
        }
      }
    } catch (err) {
      console.error("[AI] Falha ao obter serviços via webhook, fallback para DB", err)
    }

    // Fallback: ler direto do DB caso webhook não retorne nada
    if (servicosDisponiveis.length === 0) {
      const dbServicos = await db
        .select({
          nome: servicos.nome,
          descricao: servicos.descricao,
          preco: servicos.preco,
          duracao: servicos.duracao,
        })
        .from(servicos)
        .where(eq(servicos.ativo, true))

      servicosDisponiveis = dbServicos.map((s) => ({
        nome: s.nome,
        descricao: s.descricao,
        preco: s.preco ? String(s.preco) : null,
        duracao: s.duracao,
      }))
    }

    // Horários de funcionamento ainda via DB (poderia ter outro webhook)
    const horariosTrabalho = await db
      .select()
      .from(intervalosTrabalho)
      .where(eq(intervalosTrabalho.ativo, true))

    // Formatar serviços de forma concisa
    const servicosFormatados = servicosDisponiveis.length > 0
      ? servicosDisponiveis
        .map((s) => `${s.nome} - R$${s.preco ?? '0'} (${s.duracao}min)`)
        .join(", ")
      : "Nenhum serviço disponível."

    // Formatar horários
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const horariosFormatados = horariosTrabalho.length > 0
      ? horariosTrabalho
        .map((h) => `${diasSemana[h.diaSemana]}: ${h.horaInicio}-${h.horaFim}`)
        .join(", ")
      : "Horários não definidos."

    const diasFuncionamento = horariosTrabalho.map(h => diasSemana[h.diaSemana]).filter((dia): dia is string => Boolean(dia))

    const context: BusinessContext = {
      servicos: servicosDisponiveis,
      horarios: horariosTrabalho,
      servicosFormatados,
      horariosFormatados,
      diasFuncionamento
    }

    this.currentContext = context
    return context
  }

  /**
   * Extrai um dado específico de uma mensagem usando um prompt direcionado.
   * @param userMessage A mensagem do usuário.
   * @param extractionPrompt O prompt que instrui o modelo sobre o que extrair.
   * @returns O dado extraído como string, ou null se nada for encontrado.
   */
  async extractData(userMessage: string, extractionPrompt: string): Promise<string | null> {
    const prompt = `${extractionPrompt}\n\nMensagem do usuário: "${userMessage}"\n\nDado extraído:`

    try {
      const { text } = await generateText({
        model: groq("gemma2-9b-it"),
        prompt,
        maxTokens: 50,
        temperature: 0, // Temperatura 0 para extração determinística
      })

      // Limpar a resposta da IA, que pode incluir texto adicional.
      const extracted = text.trim();
      if (extracted.toLowerCase() === 'null' || extracted.toLowerCase() === 'nenhum' || extracted === '') {
        return null;
      }
      return extracted;

    } catch (error) {
      console.error("[AI] Erro ao extrair dado:", error)
      return null
    }
  }

  private getServiceNames(context: BusinessContext): string[] {
    return context.servicos.map(s => s.nome.toLowerCase())
  }

  // Carregar memória do banco de dados
  private async loadUserMemory(telefone: string): Promise<UserMemory> {
    try {
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.telefone, telefone))
        .limit(1)
        .then(rows => rows[0])

      if (conversation) {
        if (conversation.memoria_contexto) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsed: UserMemory = JSON.parse(conversation.memoria_contexto as string)
            // Garantir que campos essenciais existam
            return { ...parsed, telefone, ultimaInteracao: new Date() }
          } catch {
            console.warn('[AI] Falha ao parsear memoria_contexto, usando defaults')
          }
        }

        // Sem memória prévia → iniciar básica
        return {
          telefone,
          nomeCliente: conversation.nomeContato?.replace(' ❤️', '') || undefined,
          etapaAgendamento: 'inicial',
          ultimaInteracao: new Date()
        }
      }
    } catch (error) {
      console.error('Erro ao carregar memória:', error)
    }

    return {
      telefone,
      etapaAgendamento: 'inicial',
      ultimaInteracao: new Date()
    }
  }

  // Salvar memória no banco de dados
  private async saveUserMemory(memory: UserMemory): Promise<void> {
    try {
      await db
        .update(conversations)
        .set({
          nomeContato: memory.nomeCliente ? memory.nomeCliente + ' ❤️' : undefined,
          memoria_contexto: JSON.stringify(memory),
          ultimaInteracao: new Date(),
        })
        .where(eq(conversations.telefone, memory.telefone))
    } catch (error) {
      console.error('Erro ao salvar memória:', error)
    }
  }

  private async updateUserMemory(telefone: string, conversationHistory: ConversationMessage[], currentMessage: string): Promise<UserMemory> {
    // Carregar memória existente
    const memory = await this.loadUserMemory(telefone)
    memory.ultimaInteracao = new Date()

    // Extrair informações da mensagem atual
    this.extractInfoFromMessage(memory, currentMessage)

    // Analisar histórico para resumo (apenas se conversa longa)
    if (conversationHistory.length > 6) {
      memory.resumoConversa = this.generateCompactSummary(conversationHistory)
    }

    // Determinar etapa do agendamento
    this.updateBookingStage(memory)

    // Salvar memória atualizada
    await this.saveUserMemory(memory)

    return memory
  }

  private extractInfoFromMessage(memory: UserMemory, message: string): void {
    const msgLower = message.toLowerCase()

    // Extrair nome
    const nomeMatch = /(?:meu nome é|me chamo|sou (?:o|a)|eu sou) ([A-Za-zÀ-ÿ\s]+)/i.exec(message)
    if (nomeMatch?.[1]) {
      memory.nomeCliente = nomeMatch[1].trim()
    }

    // Extrair serviço mencionado
    if (msgLower.includes('corte') || msgLower.includes('cabelo')) {
      memory.servicoInteresse = 'Corte de Cabelo'
    } else if (msgLower.includes('barba')) {
      memory.servicoInteresse = 'Barba'
    }

    // Extrair data
    const dataExtraida = this.parseDate(message)
    if (dataExtraida) {
      memory.dataDesejada = dataExtraida
    }

    // Extrair horário
    const horarioExtraido = this.parseTime(message)
    if (horarioExtraido) {
      memory.horarioDesejado = horarioExtraido
    }
  }

  private generateCompactSummary(history: ConversationMessage[]): string {
    const recentMessages = history.slice(-4)
    const userMessages = recentMessages
      .filter(m => m.role === 'user')
      .map(m => typeof m.content === 'string' ? m.content : '')
      .join(" ")

    if (userMessages.includes('corte') || userMessages.includes('cabelo')) {
      return "Cliente interessado em corte de cabelo"
    } else if (userMessages.includes('barba')) {
      return "Cliente quer fazer a barba"
    }

    return "Conversa em andamento"
  }

  private updateBookingStage(memory: UserMemory): void {
    const hasNome = !!memory.nomeCliente
    const hasServico = !!memory.servicoInteresse
    const hasData = !!memory.dataDesejada
    const hasHorario = !!memory.horarioDesejado

    if (hasNome && hasServico && hasData && hasHorario) {
      memory.etapaAgendamento = 'confirmando'
    } else if (hasServico || hasData || hasHorario || hasNome) {
      memory.etapaAgendamento = 'coletando_info'
    } else {
      memory.etapaAgendamento = 'inicial'
    }
  }

  private parseDate(dateString: string): string | null {
    const msgLower = dateString.toLowerCase()
    const hoje = dayjs()

    // Datas relativas
    if (msgLower.includes('hoje')) {
      return hoje.format('YYYY-MM-DD')
    } else if (msgLower.includes('amanhã')) {
      return hoje.add(1, 'day').format('YYYY-MM-DD')
    }

    // Dias da semana
    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
    for (let i = 0; i < diasSemana.length; i++) {
      if (msgLower.includes(diasSemana[i]!)) {
        const proximoReq = hoje.weekday(i)
        return (proximoReq.isBefore(hoje) ? proximoReq.add(1, 'week') : proximoReq).format('YYYY-MM-DD')
      }
    }

    // Formatos de data
    const formatosData = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})\/(\d{1,2})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      /(\d{1,2})-(\d{1,2})/
    ]

    for (const formato of formatosData) {
      const match = dateString.match(formato)
      if (match) {
        const [, dia, mes, ano] = match
        const anoCompleto = ano ?? hoje.year().toString()
        const dataCandidata = dayjs(`${anoCompleto}-${mes?.padStart(2, '0')}-${dia?.padStart(2, '0')}`)

        if (dataCandidata.isValid() && dataCandidata.isAfter(hoje.subtract(1, 'day'))) {
          return dataCandidata.format('YYYY-MM-DD')
        }
      }
    }

    return null
  }

  private parseTime(timeString: string): string | null {
    const timeMatch = timeString.match(/(\d{1,2}):?(\d{2})?\s*[h:]?\s*(da manhã|da tarde|da noite)?/i)
    if (timeMatch) {
      const [, hora, minuto] = timeMatch
      const horaNum = parseInt(hora!)
      const minutoNum = parseInt(minuto ?? '0')

      if (horaNum >= 0 && horaNum <= 23 && minutoNum >= 0 && minutoNum <= 59) {
        return `${horaNum.toString().padStart(2, '0')}:${minutoNum.toString().padStart(2, '0')}`
      }
    }

    const horaSimples = timeString.match(/(\d{1,2})\s*[h:]?\s*(da manhã|da tarde|da noite)?/i)
    if (horaSimples) {
      const horaNum = parseInt(horaSimples[1]!)
      if (horaNum >= 6 && horaNum <= 23) {
        return `${horaNum.toString().padStart(2, '0')}:00`
      }
    }

    return null
  }

  private checkReadyToBook(memory: UserMemory): { ready: boolean; missing: string[] } {
    const missing: string[] = []

    if (!memory.nomeCliente) missing.push("nome")
    if (!memory.servicoInteresse) missing.push("serviço")
    if (!memory.dataDesejada) missing.push("data")
    if (!memory.horarioDesejado) missing.push("horário")

    return { ready: missing.length === 0, missing }
  }

  private buildSystemInstructions(context: BusinessContext, memory: UserMemory): string {
    const readyToBook = this.checkReadyToBook(memory)

    return `Você é um assistente de agendamentos. Seja DIRETO e CONCISO.

MEMÓRIA DO CLIENTE:
${memory.nomeCliente ? `Nome: ${memory.nomeCliente}` : "Nome: não informado"}
${memory.servicoInteresse ? `Serviço: ${memory.servicoInteresse}` : "Serviço: não definido"}
${memory.dataDesejada ? `Data: ${dayjs(memory.dataDesejada).format('DD/MM/YYYY')}` : "Data: não definida"}
${memory.horarioDesejado ? `Horário: ${memory.horarioDesejado}` : "Horário: não definido"}
${memory.resumoConversa ? `Contexto: ${memory.resumoConversa}` : ""}

SERVIÇOS: ${context.servicosFormatados}
FUNCIONAMOS: ${context.horariosFormatados}

${readyToBook.ready
        ? "✅ PRONTO PARA AGENDAR - Confirme os dados"
        : `FALTA: ${readyToBook.missing.join(", ")}`}

INSTRUÇÕES:
- Seja direto, max 2 frases
- Use emojis moderadamente
- Colete apenas info que falta
- Lembre sempre do que já sabe
- Se pronto, confirme dados para agendar

Hoje: ${dayjs().format('DD/MM/YYYY (dddd)')}`
  }

  private async createBooking(memory: UserMemory): Promise<string> {
    try {
      console.log(`📅 [AI] Tentando criar agendamento com dados:`, {
        telefone: memory.telefone,
        nome: memory.nomeCliente,
        servico: memory.servicoInteresse,
        data: memory.dataDesejada,
        horario: memory.horarioDesejado
      })

      // Usar ação direta do servidor
      const { criarAgendamento } = await import('@/lib/actions')

      const resultado = await criarAgendamento(
        memory.servicoInteresse!,
        memory.dataDesejada!,
        memory.horarioDesejado!,
        memory.telefone
      )

      // criarAgendamento retorna string, então vamos processar como string
      if (typeof resultado === 'string' && !resultado.includes('não encontrado') && !resultado.includes('Erro') && !resultado.includes('não há')) {
        memory.etapaAgendamento = 'concluido'
        await this.saveUserMemory(memory)
        return `🎉 ${resultado}`
      } else {
        return `❌ ${resultado}`
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      return "❌ Erro ao processar agendamento. Tente novamente."
    }
  }

  private buildMissingInfoMessage(missing: string[], memory: UserMemory): string {
    // Determina qual informação perguntar primeiro
    const next = missing[0]

    // Lista de serviços disponíveis (dinâmico)
    const serviceList = (this.currentContext?.servicos ?? []).map((s: { nome: string }) => s.nome).join(', ')

    switch (next) {
      case 'serviço':
        return memory.nomeCliente
          ? `Qual serviço você deseja, ${memory.nomeCliente}? Temos ${serviceList}.`
          : `Qual serviço você deseja? Temos ${serviceList}.`
      case 'data':
        return `Para qual dia você gostaria de agendar? (Ex: 30/06)`
      case 'horário':
        return `Qual horário você prefere? (Ex: 09:30)`
      case 'nome':
        return `Qual é o seu nome?`
      default:
        return `Preciso de algumas informações para continuar (faltam: ${missing.join(', ')}).`
    }
  }

  private containsConfirmation(message: string): boolean {
    const txt = message.toLowerCase()
    return txt.includes('sim') || txt.includes('confirmar') || txt.includes('ok') || txt.includes('pode')
  }

  private buildConfirmationMessage(memory: UserMemory): string {
    return `Por favor, confirme os dados:\n• Nome: ${memory.nomeCliente}\n• Serviço: ${memory.servicoInteresse}\n• Data: ${dayjs(memory.dataDesejada).format('DD/MM/YYYY')}\n• Horário: ${memory.horarioDesejado}\n\nEstá tudo correto? (responda "sim" para confirmar)`
  }

  async processMessage(
    userMessage: string,
    phoneNumber: string,
    conversationHistory: ConversationMessage[] = [],
  ): Promise<AIResponse> {
    try {
      console.log(`🤖 [AI] Processando: "${userMessage}" para ${phoneNumber}`)

      // Atualizar memória do usuário (carregada do banco)
      const memory = await this.updateUserMemory(phoneNumber, conversationHistory, userMessage)
      const businessContext = await this.getBusinessContext()

      console.log(`🧠 [AI] Memória:`, {
        cliente: memory.nomeCliente,
        etapa: memory.etapaAgendamento,
        servico: memory.servicoInteresse,
        data: memory.dataDesejada,
        horario: memory.horarioDesejado
      })

      // Verificar se está pronto para agendar
      const readyToBook = this.checkReadyToBook(memory)

      // Se ainda faltam informações, responda de forma determinística
      if (!readyToBook.ready) {
        const ask = this.buildMissingInfoMessage(readyToBook.missing, memory)
        return { message: ask }
      }

      // Se tem todas as informações e cliente confirmou, fazer agendamento
      if (readyToBook.ready && memory.etapaAgendamento === 'confirmando' && this.containsConfirmation(userMessage)) {
        console.log(`📅 [AI] Criando agendamento...`)
        return { message: await this.createBooking(memory) }
      }

      // Se todas informações coletadas mas cliente ainda não confirmou
      if (readyToBook.ready && memory.etapaAgendamento === 'confirmando' && !this.containsConfirmation(userMessage)) {
        return { message: this.buildConfirmationMessage(memory) }
      }

      // Gerar resposta contextual
      const systemInstructions = this.buildSystemInstructions(businessContext, memory)

      const { text } = await generateText({
        model: model,
        messages: [{ role: "user", content: `${systemInstructions}\n\nMENSAGEM: "${userMessage}"` }],
        maxTokens: 200, // Reduzido para respostas mais concisas
        temperature: 0.3, // Reduzido para mais consistência
      })

      console.log(`✅ [AI] Resposta gerada`)
      return { message: text ?? "Olá! Como posso ajudar? 😊" }

    } catch (error) {
      console.error("💥 [AI] Erro no processamento:", error)
      return { message: "Olá! Como posso ajudar? 😊" }
    }
  }
}

export const aiService = new AIService()
