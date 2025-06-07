import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { conversations, messages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { aiService } from "@/lib/ai-service";
import { createZApiService, getZApiConfigFromDB } from "@/lib/zapi-service";

// Tipos explícitos para o corpo esperado da requisição e mensagem recebida
interface WebhookBody {
  event: string;
  data: MessageData;
}

type MessageTipo = "texto" | "imagem" | "audio" | "documento";

interface MessageData {
  phone: string;
  message: {
    text?: string;
    body?: string;
    type?: MessageTipo;
  };
  messageId: string;
  timestamp: number;
}

// Tipos explícitos para conversa e resposta da IA
interface Conversation {
  id: string;
  clienteId: string | null;
  telefone: string;
  status: "ativa" | "encerrada" | "pausada";
  ultimaMensagem: Date | null;
  metadata: unknown;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface DbMessage {
  id: string;
  conversationId: string;
  remetente: "cliente" | "bot" | "atendente";
  conteudo: string;
  tipo: MessageTipo;
  metadata?: unknown;
  createdAt: Date | null;
}

interface AIResponse {
  message: string;
  action?: string;
  data?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebhookBody;

    if (typeof body !== "object" || !body || typeof body.event !== "string") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Verificar se é uma mensagem recebida
    if (body.event === "message-received" && body.data) {
      await handleIncomingMessage(body.data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no webhook Z-API:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

async function handleIncomingMessage(messageData: MessageData): Promise<void> {
  try {
    const { phone, message, messageId, timestamp } = messageData;

    // Buscar ou criar conversa
    let conversation: Conversation | null = await db
      .select()
      .from(conversations)
      .where(eq(conversations.telefone, phone))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    conversation ??= await db
      .insert(conversations)
      .values({
        telefone: phone,
        status: "ativa",
        ultimaMensagem: new Date(),
      })
      .returning()
      .then((rows) => rows[0] ?? null);

    if (!conversation) {
      throw new Error("Erro ao criar ou encontrar conversa!");
    }

    // Garantir tipo suportado
    const tipo: MessageTipo =
      message.type && ["texto", "imagem", "audio", "documento"].includes(message.type)
        ? message.type
        : "texto";

    // Salvar mensagem do cliente
    await db.insert(messages).values({
      conversationId: conversation.id,
      remetente: "cliente",
      conteudo: message.text ?? message.body ?? "",
      tipo,
      metadata: { messageId, timestamp },
    });

    // Buscar histórico da conversa
    const conversationHistory: DbMessage[] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt)
      .limit(10);

    // Processar mensagem com IA
    const aiResponse: AIResponse = await aiService.processMessage(
      message.text ?? message.body ?? "",
      phone,
      conversationHistory.map((msg) => ({
        role: msg.remetente === "cliente" ? "user" : "assistant",
        content: msg.conteudo,
      })),
    );

    // Salvar resposta da IA
    await db.insert(messages).values({
      conversationId: conversation.id,
      remetente: "bot",
      conteudo: aiResponse.message,
      tipo: "texto",
    });

    // Enviar resposta via WhatsApp
    const zapiConfig = await getZApiConfigFromDB();
    if (zapiConfig) {
      const zapiService = createZApiService(zapiConfig.instanceId, zapiConfig.token);
      await zapiService.sendMessage({
        phone,
        message: aiResponse.message,
      });
    }

    // Processar ações específicas se necessário
    if (aiResponse.action) {
      await handleAIAction(aiResponse.action, aiResponse.data, conversation.id, phone);
    }
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
  }
}

async function handleAIAction(
  action: string,
  data: unknown,
  conversationId: string,
  phone: string,
): Promise<void> {
  try {
    switch (action) {
      case "agendar":
        await processAgendamento(data, conversationId, phone);
        break;
      case "listar_servicos":
        await sendServicos(phone);
        break;
      case "listar_horarios":
        await sendHorarios(phone);
        break;
      case "cancelar":
        await processCancelamento(data, conversationId, phone);
        break;
      case "reagendar":
        await processReagendamento(data, conversationId, phone);
        break;
    }
  } catch (error) {
    console.error("Erro ao processar ação da IA:", error);
  }
}

async function processAgendamento(data: unknown, conversationId: string, phone: string): Promise<void> {
  // Implementar lógica de agendamento
  console.log("Processando agendamento:", data);
}

async function sendServicos(phone: string): Promise<void> {
  // Implementar envio de lista de serviços
  console.log("Enviando serviços para:", phone);
}

async function sendHorarios(phone: string): Promise<void> {
  // Implementar envio de horários disponíveis
  console.log("Enviando horários para:", phone);
}

async function processCancelamento(
  data: unknown,
  conversationId: string,
  phone: string,
): Promise<void> {
  // Implementar lógica de cancelamento
  console.log("Processando cancelamento:", data);
}

async function processReagendamento(
  data: unknown,
  conversationId: string,
  phone: string,
): Promise<void> {
  // Implementar lógica de reagendamento
  console.log("Processando reagendamento:", data);
}

// Endpoint para verificar status do webhook
export async function GET() {
  return NextResponse.json({
    status: "Webhook Z-API ativo",
    timestamp: new Date().toISOString(),
  });
}