import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export const runtime = 'edge';

// Defina o tipo esperado para cada mensagem
type Message = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

type RequestBody = {
  messages: Message[];
};

export async function POST(req: Request) {
  // Faça o parse do JSON já tipando o valor
  const body = (await req.json()) as RequestBody;

  // Validação básica para garantir que messages é um array
  if (!Array.isArray(body.messages)) {
    return new Response('Invalid request: messages must be an array', { status: 400 });
  }

  // Call the language model
  const result = streamText({
    model: groq('llama-3.1-8b-instant'),
    messages: body.messages,
  });

  // Respond with the stream
  return result.toDataStreamResponse();
}