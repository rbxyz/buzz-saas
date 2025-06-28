# FRD: Agendamento via Chatbot

**Status:** Rascunho
**Documento Pai:** [PRD: buzz-saas](./001-prd-buzz-saas.md)

## 1. Visão Geral da Funcionalidade

Esta funcionalidade permite que os clientes finais de um negócio interajam com um assistente virtual (chatbot) através do WhatsApp para realizar o ciclo completo de um agendamento: desde a consulta de informações até a confirmação final.

## 2. Requisitos Funcionais Detalhados

| ID      | Requisito                                     | Descrição Detalhada                                                                                                                                                                                          |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FRD01-1 | **Saudação e Início de Conversa**             | O chatbot deve iniciar a conversa de forma amigável quando recebe a primeira mensagem. Se o cliente já for conhecido, a saudação deve ser personalizada com seu nome.                                          |
| FRD01-2 | **Consulta de Serviços**                      | O cliente pode perguntar sobre os serviços disponíveis. O chatbot deve responder com uma lista de serviços ativos, incluindo nome, descrição e preço.                                                          |
| FRD01-3 | **Consulta de Horários de Funcionamento**     | O cliente pode perguntar sobre os horários de funcionamento. O chatbot deve retornar os dias e horas em que o estabelecimento está aberto.                                                                 |
| FRD01-4 | **Verificação de Disponibilidade**            | O cliente pode solicitar horários disponíveis para um serviço específico em uma data. O chatbot deve calcular e apresentar os "slots" de tempo livres, considerando a duração do serviço e agendamentos já existentes. |
| FRD01-5 | **Coleta de Dados para Agendamento**          | O chatbot deve ser capaz de extrair ou solicitar as informações necessárias para um agendamento: **Serviço**, **Data** e **Horário**. O **Nome do Cliente** é inferido pelo WhatsApp ou solicitado se não existir. |
| FRD01-6 | **Criação de Novo Cliente**                   | Se o número de telefone do cliente não estiver na base de dados, o chatbot deve solicitar o nome e criar um novo registro de cliente antes de prosseguir com o agendamento.                                     |
| FRD01-7 | **Confirmação do Agendamento**                | Antes de finalizar, o chatbot deve apresentar um resumo do agendamento (serviço, data, horário, nome) e pedir a confirmação do cliente.                                                                        |
| FRD01-8 | **Persistência do Agendamento**               | Após a confirmação, o agendamento deve ser salvo no banco de dados e se tornar visível no Dashboard de Gestão.                                                                                                |
| FRD01-9 | **Consulta de Agendamentos Existentes**       | (Futuro) Um cliente pode perguntar sobre seus agendamentos futuros. O chatbot deve listar os agendamentos marcados para aquele número de telefone.                                                            |
| FRD01-10| **Cancelamento de Agendamento**               | (Futuro) Um cliente pode solicitar o cancelamento de um agendamento. O chatbot deve localizar o agendamento e confirmar o cancelamento.                                                                       |

## 3. Fluxo de Interação do Usuário (User Flow)

```mermaid
graph TD
    A[Cliente envia "Olá"] --> B{Cliente já existe?};
    B -- Sim --> C[Chatbot: "Olá, [Nome]! Como posso ajudar?"];
    B -- Não --> D[Chatbot: "Olá! Como posso ajudar?"];
    
    subgraph "Ciclo de Agendamento"
        E[Cliente: "Quero marcar um corte"] --> F{Chatbot entende a intenção de agendar};
        F --> G[Chatbot: "Claro! Para qual dia você gostaria?"];
        G --> H[Cliente informa a data];
        H --> I[Chatbot apresenta horários disponíveis];
        I --> J[Cliente escolhe um horário];
        J --> K[Chatbot: "Confirmando: Corte, dia X às Y. Certo?"];
        K --> L{Cliente confirma?};
        L -- Sim --> M[Agendamento salvo no DB];
        L -- Não --> E;
        M --> N[Chatbot: "Agendamento confirmado! 🎉"];
    end

    C --> E;
    D --> E;
```

## 4. Documentos Técnicos Relacionados

-   [LLD: AI Service](../design/004-ai-service-lld.md)
-   [LLD: API de Webhooks](../design/002-webhooks-api-lld.md)
-   [TRD: Integração com Z-API](./004-trd-zapi-integration.md) 