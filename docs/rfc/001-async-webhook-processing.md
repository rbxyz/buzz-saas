# RFC 001: Processamento Assíncrono de Webhooks com Vercel KV Queue

-   **Autor(es):**
-   **Status:** Rascunho
-   **Data de Criação:** YYYY-MM-DD
-   **Documentos Relacionados:** [LLD: API de Webhooks](../design/002-webhooks-api-lld.md), [LLD: AI Service](../design/004-ai-service-lld.md)

## 1. Resumo (Summary)

Propõe-se a refatoração do webhook principal (`/api/webhooks/zapi`) para que ele processe as mensagens de forma assíncrona. Em vez de executar toda a lógica (incluindo a chamada para a API de IA) de forma síncrona, o webhook irá apenas adicionar a mensagem a uma fila (queue) e retornar uma resposta `200 OK` imediatamente. Um worker separado irá consumir as mensagens da fila e executar o processamento pesado.

Utilizaremos a funcionalidade de **Fila (Queue)** do **Vercel KV (Redis)**, que é uma solução simples e de baixo custo já disponível no ecossistema da Vercel.

## 2. Motivação (Motivation)

-   **Resiliência:** Atualmente, se a API da Groq (LLM) estiver lenta ou indisponível, nosso webhook pode sofrer timeout. Isso pode levar o Z-API a considerar nosso endpoint como falho e parar de enviar mensagens. O processamento assíncrono desacopla o recebimento da mensagem do seu processamento, tornando nosso sistema mais robusto.
-   **Performance:** O webhook responderá quase instantaneamente, melhorando a percepção de performance do Z-API e evitando gargalos em picos de mensagens.
-   **Escalabilidade:** Permite que o sistema absorva grandes volumes de mensagens sem sobrecarregar os recursos do servidor, processando-as em um ritmo controlado.

## 3. Proposta Detalhada (Detailed Design)

A implementação envolverá três componentes principais:

**1. O Endpoint do Webhook (Produtor):**
   - O código em `/api/webhooks/zapi/route.ts` será simplificado.
   - Sua única responsabilidade será validar a requisição e enfileirar a mensagem.
   - Utilizará a biblioteca `@vercel/kv` para adicionar o payload da mensagem à fila.

   ```typescript
   // Exemplo em /api/webhooks/zapi/route.ts
   import { kv } from '@vercel/kv';

   export async function POST(req: Request) {
     const payload = await req.json();
     // Validação do payload...

     await kv.lpush('whatsapp-messages', JSON.stringify(payload));

     return new Response('OK', { status: 200 });
   }
   ```

**2. O Worker da Fila (Consumidor):**
   - Será um novo endpoint de API (ex: `/api/queues/process-message`), protegido contra acesso público.
   - Será configurado no `vercel.json` para ser acionado como um Cron Job que roda a cada, por exemplo, 5 segundos.
   - O worker irá retirar uma mensagem da fila (`kv.rpop`), processá-la usando o `AIService` e enviar a resposta via `ZapiService`.

   ```typescript
   // Exemplo em /api/queues/process-message/route.ts
   import { kv } from '@vercel/kv';
   import { AIService } from '@/lib/ai-service';
   // ...

   export async function GET(req: Request) {
     // Proteção com chave secreta...
     const messagePayload = await kv.rpop('whatsapp-messages');
     if (!messagePayload) {
       return new Response('No messages to process', { status: 200 });
     }

     const aiService = new AIService();
     await aiService.processMessage(...); // Lógica de processamento...

     return new Response('Processed', { status: 200 });
   }
   ```

**3. Configuração na Vercel (`vercel.json`):**

```json
{
  "crons": [
    {
      "path": "/api/queues/process-message?secret=MY_SECRET",
      "schedule": "*/5 * * * * *"
    }
  ]
}
```

## 4. Desafios e Alternativas

-   **Complexidade:** Adiciona uma nova camada de complexidade (fila e worker). No entanto, usar o Vercel KV simplifica muito, evitando a necessidade de gerenciar um broker de mensagens completo como RabbitMQ.
-   **Latência de Resposta:** A resposta para o usuário final terá uma pequena latência adicional (o intervalo do cron job, ex: 5s). Isso é aceitável para um chatbot e os benefícios de resiliência superam essa desvantagem.
-   **Alternativa 1 (Manter como está):** Rejeitada por não resolver os problemas de resiliência e escalabilidade.
-   **Alternativa 2 (Usar Vercel Functions):** Poderíamos usar as filas nativas da Vercel, que são mais avançadas. No entanto, Vercel KV Queue é suficiente para nossa necessidade atual e mais simples de implementar.

## 5. Plano de Implementação

1.  Configurar o Vercel KV no projeto.
2.  Implementar o novo endpoint do worker (`/api/queues/process-message`).
3.  Modificar o webhook existente (`/api/webhooks/zapi`) para enfileirar as mensagens.
4.  Adicionar a configuração do cron job no `vercel.json`.
5.  Testar em ambiente de preview antes de fazer o deploy para produção. 