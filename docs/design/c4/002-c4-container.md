# Modelo C4 - Nível 2: Contêineres

**Status:** Rascunho
**Documento Pai:** [C4 - Nível 1: Contexto](./001-c4-context.md)

## 1. Introdução

Este diagrama de Contêineres detalha a arquitetura do sistema `buzz-saas`. Ele mostra os principais blocos de construção de alto nível, ou "contêineres" (não necessariamente Docker, mas qualquer unidade implantável ou sistema de dados).

O diagrama revela as escolhas tecnológicas e os principais padrões de comunicação entre as partes do sistema.

## 2. Diagrama de Contêineres

```mermaid
graph TD
    actor "Administrador" as Admin
    actor "Cliente Final" as Cliente

    subgraph "Sistema buzz-saas"
        direction LR
        
        WebApp["<div style='font-weight: bold'>Aplicação Web</div><br/>[Next.js / React]<br/><br/>Serve o dashboard de gestão,<br/>expõe a API tRPC e os<br/>webhooks."]
        DB["<div style='font-weight: bold'>Banco de Dados</div><br/>[PostgreSQL]<br/><br/>Armazena todos os dados:<br/>agendamentos, clientes,<br/>configurações."]

        WebApp -- "Lê e escreve em<br/>[Drizzle ORM]" --> DB
    end
    
    ZAPI[<div style='font-weight: bold'>Z-API</div><br/>[Sistema Externo]<br/>Gateway para WhatsApp]
    GROQ[<div style='font-weight: bold'>Groq API</div><br/>[Sistema Externo]<br/>API para o LLM]

    Admin -- "Usa [HTTPS]" --> WebApp
    Cliente -- "Envia/recebe mensagens via" --> ZAPI

    WebApp -- "Recebe webhooks<br/>Envia respostas<br/>[HTTPS]" --> ZAPI
    WebApp -- "Processa linguagem natural<br/>[HTTPS]" --> GROQ
    
    style DB fill:#569fdb,stroke:#3b709e,color:#fff
    style WebApp fill:#2e84d9,stroke:#1d5b99,color:#fff

```

## 3. Contêineres e Tecnologias

| Nome                | Descrição                                                                                                                                              | Tecnologia Principal |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| **Aplicação Web**   | O contêiner principal do sistema. É uma aplicação full-stack que serve o frontend do dashboard, a API tRPC para o cliente e a API de webhooks para o Z-API. | Next.js              |
| **Banco de Dados**  | O sistema de armazenamento persistente para todos os dados da aplicação. É a fonte da verdade para agendamentos, clientes, serviços e configurações.       | PostgreSQL           |

## 4. Relações de Comunicação

-   **Administrador → Aplicação Web:** O administrador utiliza o dashboard através de um navegador web via HTTPS.
-   **Aplicação Web → Banco de Dados:** A aplicação lê e escreve no banco de dados utilizando o Drizzle ORM sobre uma conexão TCP/IP padrão do PostgreSQL.
-   **Aplicação Web ↔ Z-API:** A comunicação é bidirecional via HTTPS. Nossa aplicação recebe webhooks e envia mensagens através da API REST do Z-API.
-   **Aplicação Web → Groq API:** Nossa aplicação envia requisições HTTPS para a API da Groq para processar as mensagens do chatbot e receber as respostas do LLM. 