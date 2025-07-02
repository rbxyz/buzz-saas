// O conteúdo deste arquivo será substituído pela nova arquitetura do Agente Inteligente.

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversations, messages, users } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { enviarMensagemWhatsApp } from "@/lib/zapi-service"
import { env } from "@/env"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { type CoreMessage } from 'ai'
import { agentService } from "@/lib/ai-agent-service"

// Configurar dayjs com timezone
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("America/Sao_Paulo")

// Configurações do runtime
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30 // Aumentado para dar mais tempo ao agente

interface WebhookBody {
  phone?: string
  fromMe?: boolean
  chatName?: string
  senderName?: string
  messageId?: string
  type?: string
  body?: string
  text?: { message?: string }
  isGroup?: boolean
}

interface ConversationData {
  id: number;
  telefone: string;
  nomeContato: string | null;
  memoria_context?: any;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log(`🚀 [AGENT-WEBHOOK] Iniciando processamento v2.0`)

  try {
    const body: WebhookBody = (await request.json()) as WebhookBody;
    if (body.type !== "ReceivedCallback" || body.fromMe || body.isGroup) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const phone = body.phone?.replace(/\D/g, "") ?? "";
    const messageText = body.text?.message ?? body.body ?? "";
    const senderName = body.senderName ?? body.chatName ?? "Cliente";

    if (!phone || !messageText.trim()) {
      return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 });
    }

    await processMessageWithAgent({ phone, messageText, senderName });

    const processingTime = Date.now() - startTime;
    console.log(`⚡ [AGENT-WEBHOOK] Processamento concluído em ${processingTime}ms`);
    return NextResponse.json({ success: true, status: "processed", processingTime });

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`💥 [AGENT-WEBHOOK] Erro principal (${processingTime}ms):`, error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

async function processMessageWithAgent(data: {
  phone: string
  messageText: string
  senderName: string
}) {
  const { phone, messageText, senderName } = data;
  const processStart = Date.now();

  // 1. Buscar conversa e contexto persistente
  const conversation = await getOrCreateConversation(phone, senderName);
  let memoriaContext: any = {};
  if (conversation.memoria_context) {
    try {
      memoriaContext = typeof conversation.memoria_context === 'string'
        ? JSON.parse(conversation.memoria_context)
        : conversation.memoria_context;
    } catch {
      memoriaContext = {};
    }
  }

  // 2. Salvar mensagem do usuário normalmente
  await saveMessage(conversation.id, { role: 'user', content: messageText });

  // 3. Buscar histórico
  const history = await getConversationHistory(conversation.id);

  // 4. Montar prompt de contexto
  const memoriaPrompt = `DADOS JÁ CONFIRMADOS PELO CLIENTE:\n` +
    `- Serviço: ${memoriaContext.servico ?? '??'}\n` +
    `- Data   : ${memoriaContext.data ?? '??'}\n` +
    `- Horário: ${memoriaContext.horario ?? '??'}\n`;

  // 5. Passar prompt de contexto para o agente
  const agentResponse = await agentService.processMessage(
    history,
    phone,
    senderName,
    memoriaPrompt // novo parâmetro opcional
  );

  // 6. Atualizar contexto se tool-calls relevantes
  if (agentResponse.toolCalls) {
    for (const call of agentResponse.toolCalls) {
      if (call.toolName === 'listar_horarios_disponiveis') {
        memoriaContext.servico = call.args.servico;
        memoriaContext.data = call.args.data;
      }
      if (call.toolName === 'criar_agendamento') {
        memoriaContext.servico = call.args.servico;
        memoriaContext.data = call.args.data;
        memoriaContext.horario = call.args.horario;
        memoriaContext.nome = call.args.nome;
      }
    }
    // Persistir contexto atualizado
    await db.update(conversations)
      .set({ memoria_context: memoriaContext })
      .where(eq(conversations.id, conversation.id));
  }

  // 7. Salvar resposta do agente
  await saveMessage(conversation.id, agentResponse.finalAnswer);

  if (agentResponse.toolResults) {
    for (const toolResult of agentResponse.toolResults) {
      await saveMessage(conversation.id, toolResult);
    }
  }

  // Garantir que o content seja sempre uma string para o WhatsApp
  let messageToSend = agentResponse.finalAnswer.content;
  if (typeof messageToSend !== 'string') {
    messageToSend = JSON.stringify(messageToSend);
  }
  if (!messageToSend || messageToSend.trim() === '') {
    messageToSend = "Ops, não consegui processar sua mensagem. Pode tentar novamente? 😊";
  }

  await enviarMensagemWhatsApp(phone, messageToSend);
  console.log(`🎉 [AGENT-PROCESS] Processamento finalizado em ${Date.now() - processStart}ms`);
}

async function getConversationHistory(conversationId: number): Promise<CoreMessage[]> {
  const historyDb = await db
    .select({
      raw: messages.raw,
      content: messages.content,
      role: messages.role,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(20);

  return historyDb
    .map(msg => {
      // Se raw está preenchido (mensagens novas), usar raw
      if (msg.raw) {
        return msg.raw as CoreMessage;
      }
      // Para mensagens antigas sem raw, criar CoreMessage do zero
      return {
        role: msg.role || 'user',
        content: msg.content || '',
      } as CoreMessage;
    })
    .filter(msg => msg?.content); // Filtrar mensagens inválidas
}

async function getOrCreateConversation(phone: string, senderName: string): Promise<ConversationData> {
  let userId = Number(env.CHATBOT_USER_ID);
  if (isNaN(userId)) {
    const userResult = await db.select({ id: users.id }).from(users).limit(1);
    if (!userResult?.length) throw new Error("Nenhum usuário encontrado no sistema");
    userId = userResult[0]!.id;
  }

  const conversationResult = await db.select().from(conversations).where(eq(conversations.telefone, phone)).limit(1);

  if (conversationResult.length > 0) return conversationResult[0]!;

  const newConversation = await db.insert(conversations).values({
    userId,
    telefone: phone,
    nomeContato: senderName,
    ativa: true,
  }).returning();
  return newConversation[0]!;
}

async function saveMessage(conversationId: number, message: CoreMessage): Promise<void> {
  try {
    // Determinar o content baseado no tipo de mensagem
    let contentString = '';

    if (typeof message.content === 'string') {
      contentString = message.content;
    } else if (Array.isArray(message.content)) {
      // Para mensagens com múltiplos conteúdos (como tool results)
      contentString = message.content
        .map(item => {
          if (typeof item === 'string') return item;
          if (item.type === 'text') return item.text;
          if (item.type === 'tool-result') return JSON.stringify(item.result);
          return JSON.stringify(item);
        })
        .join('\n');
    } else {
      contentString = JSON.stringify(message.content);
    }

    await db.insert(messages).values({
      conversationId,
      content: contentString,
      role: message.role as "user" | "assistant" | "system" | "bot" | "tool",
      raw: message,
    });
  } catch (error) {
    console.error(`💥 [MSG] Erro ao salvar mensagem:`, error);
    console.error(`Mensagem problemática:`, JSON.stringify(message, null, 2));
  }
}
