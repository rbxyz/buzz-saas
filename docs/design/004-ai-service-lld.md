# Low-Level Design: AI Service

**Status:** Rascunho
**Documento Pai:** [System Design (High-Level)](./001-system-design-hld.md)

## 1. Introdução

O `AIService` (`src/lib/ai-service.ts`) é o cérebro por trás do chatbot de agendamento. Sua principal responsabilidade é interpretar as mensagens dos usuários, entender suas intenções e formular respostas coerentes e úteis, orquestrando a lógica de negócio necessária para atender às solicitações.

O serviço utiliza um modelo de linguagem grande (LLM), especificamente o `llama-3.1-70b-versatile` através da API da Groq, para gerar respostas em linguagem natural.

## 2. Arquitetura e Fluxo de Processamento

O fluxo principal do serviço é reativo: ele é acionado pelo webhook `/api/webhooks/zapi` toda vez que uma nova mensagem de um cliente é recebida.

```mermaid
graph TD
    A[Webhook Z-API] -- "userMessage, phoneNumber" --> B(AIService.processMessage);
    B --> C{getBusinessContext};
    C --> D[DB: Consultar Serviços e Horários];
    B --> E{buildSystemPrompt};
    B --> F[generateText (LLM)];
    F -- "LLM Response" --> B;
    B --> G{detectAction};
    G --> H[Identifica Ação: listar_servicos, agendar, etc.];
    B -- "message, action, data" --> I[Retorno para o Webhook];
```

1.  **`processMessage`**: É o método de entrada principal. Recebe a mensagem do usuário, o telefone e o histórico da conversa.
2.  **`getBusinessContext`**: Antes de chamar o LLM, o serviço consulta o banco de dados para obter o contexto de negócio atualizado:
    -   Lista de serviços ativos.
    -   Horários de funcionamento (intervalos de trabalho).
3.  **`buildSystemPrompt`**: Com o contexto do negócio, o serviço constrói um "prompt de sistema". Este é um texto de instrução fundamental que diz ao LLM como ele deve se comportar, qual é o seu papel (assistente de agendamento), quais são os serviços/horários e como deve interagir com o usuário.
4.  **`generateText`**: O serviço faz uma chamada para a API do LLM (Groq), enviando:
    -   O prompt de sistema.
    -   As últimas mensagens do histórico da conversa.
    -   A nova mensagem do usuário.
5.  **`detectAction`**: Após receber a resposta do LLM, o método `detectAction` analisa a **mensagem original do usuário** para inferir uma intenção estruturada (uma "ação"). Isso é feito com uma lógica simples baseada em palavras-chave (ex: "agendar", "preço", "cancelar").
6.  **Resposta Final**: O método retorna um objeto contendo:
    -   `message`: A resposta em linguagem natural gerada pelo LLM.
    -   `action`: A ação estruturada detectada (se houver).
    -   `data`: Dados adicionais relacionados à ação.

## 3. Detecção de Intenções (Actions)

A abordagem atual (`detectAction`) para identificar a intenção do usuário é baseada em palavras-chave presentes na mensagem original do usuário.

| Palavras-Chave                                | Ação Gerada             |
| --------------------------------------------- | ----------------------- |
| "agendar", "marcar", "horário"                | `agendar_direto`        |
| "serviço", "preço", "valor"                   | `listar_servicos`       |
| "disponível", "livre", "vago"                 | `listar_horarios`       |
| "meu agendamento", "minha consulta"           | `consultar_agendamentos`|
| "cancelar", "desmarcar"                       | `cancelar`              |
| "reagendar", "remarcar", "mudar"              | `reagendar`             |

Esta lógica simples serve como uma primeira camada de roteamento, permitindo que o webhook que chamou o `AIService` execute lógicas mais complexas (como chamar outros webhooks de ação) com base na intenção.

## 4. Dívida Técnica e Observações

-   **Implementações Duplicadas:** O arquivo contém uma implementação mais antiga e complexa (`processMessageOld` e muitas funções auxiliares de extração manual). A implementação atual (`processMessage`) é significativamente mais simples e delega a maior parte da lógica de conversação para o LLM. A implementação antiga deve ser removida após a validação completa da nova.
-   **Detecção de Ação Simplista:** O método `detectAction` atual é funcional, mas limitado. Ele analisa a mensagem do usuário, e não a resposta do LLM, o que pode levar a desvios. Uma abordagem mais robusta seria fazer com que o próprio LLM retornasse um objeto JSON estruturado com a intenção e os dados (usando "tool calling" ou "function calling" da AI SDK), eliminando a necessidade da função `detectAction`.

## 5. Próximos Passos

-   Refatorar e remover a implementação `processMessageOld`.
-   Melhorar a detecção de ação, possivelmente utilizando a funcionalidade de "tool calling" da Vercel AI SDK para que o LLM retorne dados estruturados.
-   Centralizar a gestão de contexto de agendamento (o que está sendo agendado para quem) para conversas mais longas. 