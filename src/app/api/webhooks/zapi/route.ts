// O conteúdo deste arquivo será substituído pela nova arquitetura do Agente Inteligente.

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { conversations, messages, users } from "@/server/db/schema"
import { eq, desc } from "drizzle-orm"
import { enviarMensagemWhatsApp } from "@/lib/zapi-service"
import { env } from "@/env"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { type CoreMessage, type ToolCall } from 'ai'
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

  const conversation = await getOrCreateConversation(phone, senderName);

  await saveMessage(conversation.id, { role: 'user', content: messageText });

  const history = await getConversationHistory(conversation.id);

  const agentResponse = await agentService.processMessage(
    history,
    phone,
    senderName
  );

  await saveMessage(conversation.id, agentResponse.finalAnswer);

  if (agentResponse.toolResults) {
    for (const toolResult of agentResponse.toolResults) {
      await saveMessage(conversation.id, toolResult);
    }
  }

  // Garantir que o content seja sempre uma string para o WhatsApp
  let messageToSend = agentResponse.finalAnswer.content;
  if (typeof messageToSend !== 'string') {
    // Se não for string, converta para string de forma segura
    messageToSend = JSON.stringify(messageToSend);
  }

  // Garantir que não seja uma string vazia
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
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(20);

  return historyDb.map(msg => msg.raw as CoreMessage);
}

async function getOrCreateConversation(phone: string, senderName: string): Promise<ConversationData> {
  let userId = Number(env.CHATBOT_USER_ID);
  if (isNaN(userId)) {
    const userResult = await db.select({ id: users.id }).from(users).limit(1);
    if (!userResult || userResult.length === 0) throw new Error("Nenhum usuário encontrado no sistema");
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
  if (typeof message.content !== 'string') {
    // Lidar com content que não é string, talvez serializando
    message.content = JSON.stringify(message.content);
  }
  try {
    await db.insert(messages).values({
      conversationId,
      content: message.content,
      role: message.role,
      raw: message,
    });
  } catch (error) {
    console.error(`💥 [MSG] Erro ao salvar mensagem:`, error);
  }
}
