import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversations, messages, users, servicos } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { aiService } from "@/lib/ai-service"
import { enviarMensagemWhatsApp } from "@/lib/zapi-service"
import { env } from "@/env"
import dayjs from "dayjs"

// Configurações do runtime
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 25

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

// Tipos para a máquina de estados do agendamento
type StatusAgendamento =
  | "ocioso"
  | "coletando_servico"
  | "coletando_data"
  | "coletando_horario"
  | "confirmacao_final"
  | "concluido";

interface MemoriaAgendamento {
  status: StatusAgendamento;
  servicoId?: number | null;
  servicoNome?: string | null;
  data?: string | null; // Formato YYYY-MM-DD
  horario?: string | null; // Formato HH:mm
  tentativas?: number;
}

interface ConversationData {
  id: number
  userId: number
  clienteId: number | null
  telefone: string
  nomeContato: string | null
  ultimaMensagem: string | null
  ultimaInteracao: Date
  ativa: boolean
  memoria_contexto?: MemoriaAgendamento | null;
  createdAt: Date | null
  updatedAt: Date | null
}

// Timeout configurável: PROCESS_TIMEOUT_MS (ms) – default 15000
const DEFAULT_TIMEOUT = Number(process.env.PROCESS_TIMEOUT_MS) || 15000

// Função para executar operações do banco com timeout
async function executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs = DEFAULT_TIMEOUT): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.error(`⏰ [TIMEOUT] Operação cancelada após ${timeoutMs}ms`)
    controller.abort()
  }, timeoutMs)

  try {
    console.log(`⏳ [DB] Executando operação com timeout de ${timeoutMs}ms...`)
    const result = await operation()
    clearTimeout(timeoutId)
    console.log(`✅ [DB] Operação concluída com sucesso`)
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    console.error(`💥 [DB] Erro na operação:`, error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log("🟢 [WEBHOOK_V2] Executando a versão corrigida do webhook.")
  const startTime = Date.now()
  console.log(`🚀 [WEBHOOK] Iniciando processamento do webhook Z-API`)

  try {
    let body: WebhookBody
    try {
      body = (await request.json()) as WebhookBody
      console.log(`📨 [WEBHOOK] Dados recebidos:`, {
        type: body.type,
        phone: body.phone,
        fromMe: body.fromMe,
        isGroup: body.isGroup,
        messagePreview: body.text?.message?.substring(0, 50) ?? body.body?.substring(0, 50),
      })
    } catch (error) {
      console.error("❌ [WEBHOOK] Erro ao fazer parse do JSON:", error)
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    // Validações básicas
    if (body.type !== "ReceivedCallback") {
      console.log(`🔄 [WEBHOOK] Ignorando evento: ${body.type}`)
      return NextResponse.json({ success: true, ignored: true, reason: "not_received_callback" })
    }

    if (body.fromMe === true) {
      console.log(`🔄 [WEBHOOK] Ignorando mensagem própria`)
      return NextResponse.json({ success: true, ignored: true, reason: "from_me" })
    }

    if (body.isGroup === true) {
      console.log(`🔄 [WEBHOOK] Ignorando mensagem de grupo`)
      return NextResponse.json({ success: true, ignored: true, reason: "group_message" })
    }

    // Extrair dados da mensagem
    const phone = body.phone?.replace(/\D/g, "") ?? ""
    const messageText = body.text?.message ?? body.body ?? ""
    const messageId = body.messageId ?? `${Date.now()}-${Math.random()}`
    const timestamp = body.momment ?? body.timestamp ?? Date.now()
    const senderName = body.senderName ?? body.chatName ?? ""

    if (!phone || !messageText.trim()) {
      console.log(`❌ [WEBHOOK] Dados insuficientes - phone: ${phone}, message: ${messageText}`)
      return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 })
    }

    console.log(`✅ [WEBHOOK] Mensagem válida de ${phone}: "${messageText.substring(0, 100)}..."`)

    // Verificar se as variáveis de ambiente estão configuradas
    console.log(`🔍 [WEBHOOK] Verificando configuração via variáveis de ambiente...`)

    const groqApiKey = process.env.GROQ_API_KEY
    const zapiInstanceId = process.env.ZAPI_INSTANCE_ID
    const zapiToken = process.env.ZAPI_TOKEN
    const zapiClientToken = process.env.ZAPI_CLIENT_TOKEN

    if (!groqApiKey || !zapiInstanceId || !zapiToken || !zapiClientToken) {
      console.log(`❌ [WEBHOOK] Variáveis de ambiente não configuradas:`, {
        groq: !!groqApiKey,
        instance: !!zapiInstanceId,
        token: !!zapiToken,
        clientToken: !!zapiClientToken
      })
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "environment_variables_missing"
      })
    }

    console.log(`✅ [WEBHOOK] Todas as variáveis de ambiente configuradas`)

    // O processamento agora será síncrono para garantir a execução em ambiente serverless.
    // A resposta ao webhook só será enviada após a conclusão.
    try {
      await processMessage({
        phone,
        messageText,
        messageId,
        timestamp,
        senderName,
      })

      const processingTime = Date.now() - startTime
      console.log(`⚡ [WEBHOOK] Resposta enviada após processamento completo em ${processingTime}ms`)
      return NextResponse.json({
        success: true,
        processingTime,
        status: "processed",
      })

    } catch (processingError) {
      console.error(`💥 [WEBHOOK] Erro durante o processamento da mensagem:`, processingError)

      const errorMessage = processingError instanceof Error ? processingError.message : "Erro desconhecido durante o processamento";

      // Mesmo com erro no processamento, retornamos 200 para o Z-API não reenviar.
      // O erro já foi logado.
      return NextResponse.json({
        success: false,
        status: "error_during_processing",
        error: errorMessage,
      })
    }
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`💥 [WEBHOOK] Erro principal (${processingTime}ms):`, error)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        processingTime,
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 },
    )
  }
}

async function processMessage(data: {
  phone: string
  messageText: string
  messageId: string
  timestamp: number
  senderName: string
}): Promise<void> {
  const { phone, messageText, messageId, timestamp, senderName } = data
  const processStart = Date.now()
  console.log(`🔄 [PROCESS] Iniciando processamento para ${phone}`)

  // 1. Obter ou criar a conversa e o cliente associado
  const conversation = await getOrCreateConversation(phone, senderName, messageText)

  // 2. Salvar a mensagem do usuário
  await saveMessage(conversation.id, messageText, "user", new Date(timestamp), messageId)

  // 3. Gerenciar o estado da conversa e determinar a próxima ação
  await gerenciarEstadoConversa(conversation, messageText)

  const totalTime = Date.now() - processStart
  console.log(`🎉 [PROCESS] Processamento concluído em ${totalTime}ms para ${phone}`)
}

/**
 * Orquestrador principal da conversa, baseado em uma máquina de estados.
 */
async function gerenciarEstadoConversa(conversation: ConversationData, userMessage: string) {
  let memoria = conversation.memoria_contexto ?? { status: 'ocioso' };

  console.log(`🧠 [STATE] Estado atual: ${memoria.status}, Memória:`, memoria)

  // Lógica da máquina de estados
  switch (memoria.status) {
    case 'ocioso': {
      const palavrasChaveAgendamento = ["agendar", "marcar", "horário", "agenda", "agendamento"];
      const intençãoAgendamento = palavrasChaveAgendamento.some(p => userMessage.toLowerCase().includes(p));

      if (intençãoAgendamento) {
        console.log(`🧠 [STATE] Intenção de agendamento detectada. Mudando para 'coletando_servico'`);

        // Buscar serviços disponíveis para apresentar ao usuário
        const servicosDisponiveis = await db.select({ nome: servicos.nome, id: servicos.id }).from(servicos).where(eq(servicos.ativo, true));
        const listaServicos = servicosDisponiveis.map(s => `- ${s.nome}`).join('\n');
        const mensagem = `Legal! Vamos marcar. Qual desses serviços você gostaria?\n\n${listaServicos}`;

        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');

        memoria.status = 'coletando_servico';
        await updateConversationMemory(conversation.id, memoria);
      } else {
        const mensagem = "Olá! Sou seu assistente de agendamento. Para começar, diga 'quero agendar' ou me pergunte sobre os serviços. 😊";
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
      }
      break;
    }

    case 'coletando_servico': {
      console.log(`🧠 [STATE] Coletando serviço...`);
      const servicosDisponiveis = await db.select().from(servicos).where(eq(servicos.ativo, true));

      const servicoSelecionado = servicosDisponiveis.find(s =>
        userMessage.toLowerCase().includes(s.nome.toLowerCase())
      );

      if (servicoSelecionado) {
        memoria.status = 'coletando_data';
        memoria.servicoId = servicoSelecionado.id;
        memoria.servicoNome = servicoSelecionado.nome;

        const mensagem = `Ótima escolha! Para qual dia você gostaria de agendar o serviço de ${servicoSelecionado.nome}?`;
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
        await updateConversationMemory(conversation.id, memoria);
      } else {
        const listaServicos = servicosDisponiveis.map(s => `- ${s.nome}`).join('\n');
        const mensagem = `Hum, não encontrei esse serviço. Por favor, escolha um da lista abaixo:\n\n${listaServicos}`;
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
        // O estado não muda, continua como 'coletando_servico' para a próxima tentativa.
      }
      break;
    }

    case 'coletando_data': {
      console.log(`🧠 [STATE] Coletando data...`);
      const promptExtracao = `Analise a mensagem do usuário e extraia apenas a data, respondendo estritamente no formato AAAA-MM-DD. Considere "hoje" como ${dayjs().format('YYYY-MM-DD')} e "amanhã" como ${dayjs().add(1, 'day').format('YYYY-MM-DD')}. Se nenhuma data for mencionada, responda 'null'.`;
      const dataExtraida = await aiService.extractData(userMessage, promptExtracao);

      if (!dataExtraida || !/^\d{4}-\d{2}-\d{2}$/.test(dataExtraida)) {
        const mensagem = "Não consegui entender a data. Por favor, diga o dia que você quer, como 'hoje', 'amanhã' ou '25 de julho'.";
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
        break;
      }

      const dataObj = dayjs(dataExtraida);
      if (dataObj.isBefore(dayjs().startOf('day'))) {
        const mensagem = "Essa data já passou! Por favor, escolha uma data a partir de hoje.";
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
        break;
      }

      // Usar o webhook interno para buscar horários (fonte única da verdade)
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const resp = await fetch(`${baseUrl}/api/webhooks/listar-horarios?data=${dataExtraida}&servico=${memoria.servicoNome}`);
      const horariosData = await resp.json() as { success: boolean, periodos?: { manha: string[], tarde: string[] } };

      if (horariosData.success && horariosData.periodos && (horariosData.periodos.manha.length > 0 || horariosData.periodos.tarde.length > 0)) {
        const manha = horariosData.periodos.manha.join('h, ') + (horariosData.periodos.manha.length > 0 ? 'h' : '');
        const tarde = horariosData.periodos.tarde.join('h, ') + (horariosData.periodos.tarde.length > 0 ? 'h' : '');

        let mensagemHorarios = `Ótimo! Para o dia ${dataObj.format('DD/MM')}, tenho os seguintes horários disponíveis:\n`;
        if (manha.length > 0) mensagemHorarios += `\n☀️ *Manhã:* ${manha}`;
        if (tarde.length > 0) mensagemHorarios += `\n🌙 *Tarde:* ${tarde}`;
        mensagemHorarios += `\n\nQual você prefere?`;

        memoria.status = 'coletando_horario';
        memoria.data = dataExtraida;
        await enviarMensagemWhatsApp(conversation.telefone, mensagemHorarios);
        await saveMessage(conversation.id, mensagemHorarios, 'assistant', new Date(), '');
        await updateConversationMemory(conversation.id, memoria);
      } else {
        const mensagem = `Poxa, não tenho horários disponíveis para o dia ${dataObj.format('DD/MM')}. Que tal tentar outra data?`;
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
      }
      break;
    }

    case 'coletando_horario': {
      console.log(`🧠 [STATE] Coletando horário...`);
      const promptExtracao = `Analise a mensagem do usuário e extraia apenas o horário, respondendo estritamente no formato HH:mm. Se nenhum horário for mencionado, responda 'null'.`;
      const horarioExtraido = await aiService.extractData(userMessage, promptExtracao);

      if (!horarioExtraido || !/^\d{2}:\d{2}$/.test(horarioExtraido)) {
        const mensagem = "Não consegui entender o horário. Por favor, diga a hora que você quer, como '14:30' ou '3 da tarde'.";
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
        break;
      }

      // Validar se o horário extraído estava na lista de opções
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const resp = await fetch(`${baseUrl}/api/webhooks/listar-horarios?data=${memoria.data}&servico=${memoria.servicoNome}`);
      const horariosData = await resp.json() as { success: boolean, horariosDisponiveis?: string[] };

      if (horariosData.success && horariosData.horariosDisponiveis?.includes(horarioExtraido)) {
        memoria.status = 'confirmacao_final';
        memoria.horario = horarioExtraido;

        const mensagem = `Ok! Só para confirmar antes de agendar:\n\n*Serviço:* ${memoria.servicoNome}\n*Data:* ${dayjs(memoria.data).format('DD/MM/YYYY')}\n*Horário:* ${memoria.horario}\n\nPosso confirmar? (Responda "sim" ou "não")`;

        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
        await updateConversationMemory(conversation.id, memoria);
      } else {
        const mensagem = `Hum, o horário ${horarioExtraido} não parece estar disponível. Por favor, escolha um dos horários que te enviei.`;
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
      }
      break;
    }

    case 'confirmacao_final': {
      console.log(`🧠 [STATE] Aguardando confirmação final...`);
      const userMessageLower = userMessage.toLowerCase();
      const confirmacoes = ["sim", "pode", "confirma", "isso", "certo", "ok"];
      const negacoes = ["não", "nao", "cancela", "mudar"];

      if (confirmacoes.some(p => userMessageLower.includes(p))) {
        // Chamar o webhook para criar o agendamento
        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        const resp = await fetch(`${baseUrl}/api/webhooks/criar-agendamento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefone: conversation.telefone,
            nome: conversation.nomeContato ?? "Cliente",
            servico: memoria.servicoNome,
            data: memoria.data,
            horario: memoria.horario,
          }),
        });

        const resultadoAgendamento = await resp.json() as { success: boolean; message?: string, error?: string };

        if (resultadoAgendamento.success && resultadoAgendamento.message) {
          await enviarMensagemWhatsApp(conversation.telefone, resultadoAgendamento.message);
          await saveMessage(conversation.id, resultadoAgendamento.message, 'assistant', new Date(), '');

          memoria.status = 'concluido';
          await updateConversationMemory(conversation.id, memoria);
        } else {
          const mensagemErro = `Opa, tivemos um problema ao tentar confirmar seu horário: ${resultadoAgendamento.error}. Vamos tentar de novo. Para qual data você gostaria de agendar?`;
          await enviarMensagemWhatsApp(conversation.telefone, mensagemErro);
          await saveMessage(conversation.id, mensagemErro, 'assistant', new Date(), '');

          // Resetar para coletar a data novamente
          memoria.status = 'coletando_data';
          memoria.data = null;
          memoria.horario = null;
          await updateConversationMemory(conversation.id, memoria);
        }

      } else if (negacoes.some(p => userMessageLower.includes(p))) {
        const mensagem = "Ok, sem problemas! Se quiser recomeçar, é só dizer 'quero agendar'.";
        memoria = { status: 'ocioso' }; // Reset completo
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
        await updateConversationMemory(conversation.id, memoria);
      } else {
        const mensagem = `Não entendi. Por favor, responda com "sim" para confirmar o agendamento ou "não" para cancelar.`;
        await enviarMensagemWhatsApp(conversation.telefone, mensagem);
        await saveMessage(conversation.id, mensagem, 'assistant', new Date(), '');
      }
      break;
    }

    case 'concluido':
      // TODO: Agradecer e voltar para o estado ocioso
      console.log('TODO: Implementar estado CONCLUIDO')
      await enviarMensagemWhatsApp(conversation.telefone, "Seu agendamento já foi confirmado! 😊 Se precisar de algo mais, é só chamar.")
      memoria = { status: 'ocioso' } // Resetar
      await updateConversationMemory(conversation.id, memoria);
      break;

    default:
      console.error(`❌ [STATE] Estado desconhecido: ${memoria.status}`)
      await enviarMensagemWhatsApp(conversation.telefone, "Desculpe, ocorreu um erro interno. Tente novamente mais tarde.")
  }
}

/**
 * Busca uma conversa existente ou cria uma nova.
 */
async function getOrCreateConversation(phone: string, senderName: string, messageText: string): Promise<ConversationData> {
  // Lógica de busca/criação de usuário...
  let userId = Number(env.CHATBOT_USER_ID);
  if (isNaN(userId)) {
    const user = await executeWithTimeout(() => db.select({ id: users.id }).from(users).limit(1));
    if (!user || user.length === 0) throw new Error("Nenhum usuário encontrado no sistema");
    userId = user[0]!.id;
  }

  const conversation = await executeWithTimeout(() =>
    db.select().from(conversations).where(eq(conversations.telefone, phone)).limit(1)
  );

  if (conversation && conversation.length > 0) {
    console.log(`✅ [CONV] Conversa existente encontrada: ${conversation[0]!.id}`);
    return conversation[0] as ConversationData;
  }

  console.log(`🆕 [CONV] Criando nova conversa para ${phone}`);
  const newConversation = await executeWithTimeout(() =>
    db.insert(conversations).values({
      userId,
      telefone: phone,
      nomeContato: senderName || null,
      ativa: true,
      ultimaMensagem: messageText.substring(0, 500),
      ultimaInteracao: new Date(),
      memoria_contexto: { status: 'ocioso' } // Estado inicial
    }).returning()
  );

  return newConversation[0]! as ConversationData;
}

/**
 * Salva uma mensagem no banco de dados.
 */
async function saveMessage(conversationId: number, content: string, role: 'user' | 'assistant', timestamp: Date, messageId: string): Promise<void> {
  console.log(`💾 [MSG] Salvando mensagem: role=${role}, convId=${conversationId}`);
  await executeWithTimeout(() =>
    db.insert(messages).values({
      conversationId,
      content,
      role,
      timestamp,
      messageId,
    })
  );
  console.log(`✅ [MSG] Mensagem salva.`);
}

/**
 * Atualiza a memória de contexto da conversa.
 */
async function updateConversationMemory(conversationId: number, memoria: MemoriaAgendamento): Promise<void> {
  console.log(`🧠 [MEM] Atualizando memória para convId=${conversationId}:`, memoria);
  await executeWithTimeout(() =>
    db.update(conversations)
      .set({ memoria_contexto: memoria, ultimaInteracao: new Date() })
      .where(eq(conversations.id, conversationId))
  );
  console.log(`✅ [MEM] Memória atualizada.`);
}

// Endpoint GET para verificar status
export async function GET() {
  return NextResponse.json({
    status: "Webhook Z-API ativo",
    timestamp: new Date().toISOString(),
    version: "2.0",
  })
}
