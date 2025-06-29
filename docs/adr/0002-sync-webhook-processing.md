# ADR 0002: Processamento Síncrono de Webhooks para Garantir Execução

**Status:** Aceito

## Contexto

O webhook principal (`/api/webhooks/zapi`) foi inicialmente projetado com uma lógica "fire-and-forget". Ele recebia a mensagem do Z-API, iniciava a função `processMessage` em segundo plano e retornava uma resposta `200 OK` imediatamente. O objetivo era evitar timeouts no serviço do Z-API.

No entanto, em um ambiente serverless (Vercel), esse padrão se mostrou problemático. Após o envio da resposta HTTP, a execução da função serverless não era garantida e frequentemente era terminada prematuramente.

**Sintoma:** Os logs mostravam que o webhook recebia a mensagem, mas o processamento interno (consultas ao banco de dados, chamadas à IA) não era concluído, resultando em conversas que nunca eram respondidas.

## Decisão

Mudar a implementação do webhook `POST /api/webhooks/zapi` de um padrão "fire-and-forget" para um **bloqueio síncrono**.

A função principal agora usará `await` para esperar a conclusão total da função `processMessage` antes de retornar uma resposta HTTP. A resposta ao Z-API só é enviada depois que a mensagem do usuário foi processada, salva no banco de dados, respondida pela IA e enviada de volta ao WhatsApp.

## Consequências

### Positivas

-   **Confiabilidade:** A execução completa do fluxo de processamento de mensagens é agora garantida. O sistema se tornou funcional e estável no ambiente de produção.
-   **Simplicidade:** A correção foi direta (adição de `await` e um bloco `try/catch`), não introduzindo novos componentes de infraestrutura.

### Negativas e Mitigações

-   **Aumento da Latência:** O tempo de resposta do webhook aumentou significativamente. Antes era de `~4ms` e agora reflete o tempo total de processamento, que pode levar vários segundos.
-   **Risco de Timeout:** Com o aumento da latência, cresce o risco de a chamada do Z-API atingir seu próprio limite de timeout, especialmente se a API de IA ou o banco de dados estiverem lentos.
    -   **Mitigação Imediata:** O timeout da nossa função serverless foi aumentado (`maxDuration`).
    -   **Mitigação Estratégica:** Esta decisão é uma solução **tática** para garantir a funcionalidade imediata. A solução estratégica de longo prazo, que resolve a latência e o risco de timeout de forma robusta, está descrita no documento **[RFC 001: Processamento Assíncrono de Webhooks com Vercel KV Queue](../rfc/001-async-webhook-processing.md)**. A implementação futura dessa RFC reverterá essa decisão, substituindo-a por um sistema de filas mais resiliente. 