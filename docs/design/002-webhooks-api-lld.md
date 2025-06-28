# Low-Level Design: API de Webhooks

**Status:** Rascunho
**Documento Pai:** [System Design (High-Level)](./001-system-design-hld.md)

## 1. Introdução

Este documento detalha a arquitetura e o funcionamento dos endpoints de webhook no `buzz-saas`. Os webhooks são o principal mecanismo para a comunicação em tempo real entre serviços de terceiros (como o Z-API) e a nossa aplicação, sendo a espinha dorsal da funcionalidade do chatbot.

## 2. Visão Geral dos Endpoints

A API de webhooks está localizada em `src/app/api/webhooks/`. Cada subdiretório corresponde a um endpoint específico que é acionado por diferentes eventos ou intenções do chatbot.

```mermaid
graph TD
    subgraph "Serviço Externo"
        ZAPI[Z-API]
    end

    subgraph "Gateway de Webhook"
        A[/api/webhooks/zapi]
    end

    subgraph "Controladores de Ação (Webhooks Internos)"
        B[/buscar-cliente]
        C[/criar-agendamento]
        D[/criar-cliente]
        E[/listar-horarios]
        F[/listar-servicos]
        G[/verificar-disponibilidade]
    end

    ZAPI -- "Nova Mensagem" --> A
    A -- "Intenção: Agendar" --> C
    A -- "Intenção: Ver Horários" --> E
    A -- "Outras Intenções..." --> B & D & F & G
```

## 3. Detalhamento dos Endpoints

### 3.1. `POST /api/webhooks/zapi`

-   **Responsabilidade:** É o principal ponto de entrada (gateway) para todas as mensagens recebidas do WhatsApp via Z-API.
-   **Gatilho:** Uma nova mensagem enviada pelo cliente final para o número de telefone conectado.
-   **Fluxo de Processamento:**
    1.  Recebe o payload do Z-API, contendo a mensagem do usuário e metadados (como o número de telefone).
    2.  Extrai o texto da mensagem e o ID da conversa.
    3.  Chama o `ai-service` para realizar o **processamento de linguagem natural (PLN)** e identificar a **intenção** do usuário (ex: `listar-servicos`, `criar-agendamento`).
    4.  Com base na intenção identificada, o serviço pode:
        -   Chamar um dos webhooks de ação internos (listados abaixo) para executar a lógica de negócio específica.
        -   Formular uma resposta simples diretamente (ex: saudação).
    5.  Envia a resposta de volta ao usuário através do `zapi-service`.

### 3.2. Webhooks de Ação (Actions)

Estes endpoints são acionados principalmente pelo webhook gateway (`/zapi`) após a identificação da intenção do usuário. Eles lidam com a lógica de negócio específica para cada ação.

-   **`POST /api/webhooks/listar-servicos`**
    -   **Responsabilidade:** Consultar o banco de dados e retornar a lista de serviços disponíveis.

-   **`POST /api/webhooks/listar-horarios`**
    -   **Responsabilidade:** Com base em um serviço e uma data, consultar os intervalos de trabalho e os agendamentos existentes para retornar os horários disponíveis.

-   **`POST /api/webhooks/verificar-disponibilidade`**
    -   **Responsabilidade:** Validar se um horário específico para um serviço ainda está disponível.

-   **`POST /api/webhooks/buscar-cliente`**
    -   **Responsabilidade:** Localizar um cliente no banco de dados a partir do número de telefone.

-   **`POST /api/webhooks/criar-cliente`**
    -   **Responsabilidade:** Cadastrar um novo cliente no sistema.

-   **`POST /api/webhooks/criar-agendamento`**
    -   **Responsabilidade:** Efetivar o agendamento no banco de dados, associando cliente, serviço e horário.

## 4. Segurança

-   Todos os endpoints de webhook devem ser protegidos. Uma vez que são publicamente acessíveis, a validação da requisição é crucial.
-   **Estratégia Atual (Implícita):** A segurança pode estar sendo feita pela verificação de um `secret` ou `token` no cabeçalho da requisição, que deve ser configurado no painel do Z-API.
-   **Melhoria Sugerida:** Implementar uma verificação de assinatura HMAC para garantir que o payload foi enviado pelo Z-API e não foi modificado, se o serviço oferecer essa funcionalidade.

## 5. Considerações de Escalabilidade

-   **Processamento Assíncrono:** Para evitar timeouts e lidar com picos de mensagens, as ações mais demoradas (como as que envolvem chamadas à IA) podem ser movidas para uma fila de processamento (ex: RabbitMQ, AWS SQS, ou Vercel Q) no futuro. O webhook responderia imediatamente com um `200 OK` e o processamento ocorreria em background.
-   **Cold Starts:** Por serem funções serverless, os endpoints podem sofrer com "cold starts". O `ai-service` e as conexões de banco de dados devem ser otimizados para inicializações rápidas. 