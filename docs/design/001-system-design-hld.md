# System Design (High-Level): buzz-saas

**Status:** Rascunho

## 1. Introdução e Visão Geral

O `buzz-saas` é uma plataforma de Software as a Service (SaaS) projetada para automatizar e gerenciar o agendamento de serviços. O sistema oferece um dashboard para administradores e uma interface de chatbot (integrada com WhatsApp via Z-API) para que os clientes finais possam consultar serviços, verificar horários e marcar agendamentos de forma autônoma.

O objetivo principal é otimizar a gestão de agenda, reduzir o trabalho manual e fornecer uma experiência de agendamento fluida e conveniente para o cliente final.

## 2. Arquitetura do Sistema

O sistema é construído como uma aplicação web monolítica full-stack, utilizando o framework **Next.js**. A arquitetura pode ser dividida em três camadas principais:

```mermaid
graph TD
    subgraph "Cliente (Usuário Final)"
        C[WhatsApp] -->|Z-API Webhook| B;
    end

    subgraph "buzz-saas (Aplicação Principal)"
        A[Dashboard Admin<br/>(Next.js Frontend)] -->|tRPC| B(Next.js Backend);
        B --> D[Banco de Dados<br/>(PostgreSQL)];
    end

    subgraph "Integrações"
        B -->|AI/Embeddings| E[Serviço de IA];
    end

    style C fill:#25D366,stroke:#fff
    style A fill:#0070f3,stroke:#fff
```

-   **Frontend (Cliente):** Uma interface de administração (Dashboard) construída com React e componentes Shadcn UI. Permite aos usuários gerenciar agendamentos, clientes, configurações, etc.
-   **Backend (Servidor):** A lógica de negócio reside no backend do Next.js, com rotas de API construídas usando **tRPC** para comunicação tipada e segura com o frontend. Além disso, expõe rotas de API REST para receber **webhooks** de serviços externos (Z-API).
-   **Banco de Dados:** Um banco de dados **PostgreSQL** serve como a fonte de verdade para todos os dados da aplicação. O acesso aos dados é gerenciado pelo ORM **Drizzle**.

## 3. Principais Tecnologias

-   **Framework Full-Stack:** [Next.js](https://nextjs.org/) (com App Router)
-   **Linguagem:** TypeScript
-   **API Interna:** [tRPC](https://trpc.io/)
-   **Banco de Dados:** PostgreSQL
-   **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
-   **UI (Frontend):** [React](https://react.dev/), [Shadcn UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
-   **Autenticação:** (A ser detalhado em um LLD)
-   **Integração de Chatbot:** [Z-API](https://z-api.io/)
-   **Inteligência Artificial:** (A ser detalhado em um LLD)

## 4. Fluxo de Dados Principais

### 4.1. Fluxo de Agendamento via Chatbot

1.  O cliente envia uma mensagem para o número de WhatsApp configurado.
2.  O Z-API encaminha a mensagem para o webhook `/api/webhooks/zapi`.
3.  A rota do webhook processa a mensagem, utilizando o `ai-service` para interpretar a intenção do usuário (ex: "quero agendar", "ver horários").
4.  O backend consulta o banco de dados (via Drizzle) para obter informações sobre serviços, disponibilidade, etc.
5.  O `ai-service` formula uma resposta adequada.
6.  O backend envia a resposta de volta para o cliente através da API do Z-API.

### 4.2. Fluxo de Gerenciamento no Dashboard

1.  O administrador acessa o dashboard e faz login.
2.  O cliente frontend (React) faz uma chamada tRPC para o backend (ex: `api.agendamento.getAll`).
3.  O resolvedor tRPC no backend executa a lógica de negócio, consultando o banco de dados com Drizzle.
4.  Os dados são retornados ao frontend de forma tipada.
5.  A interface é atualizada com os dados recebidos.

## 5. Próximos Passos

-   Detalhar a autenticação, a API de webhooks e o serviço de IA em documentos de baixo nível (LLDs).
-   Criar um diagrama C4 (Containers) para visualizar melhor as integrações.
-   Documentar o esquema do banco de dados. 