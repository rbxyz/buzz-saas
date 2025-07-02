# FRD: Agendamento via Chatbot

**Status:** Implementado
**Documento Pai:** [PRD: buzz-saas](./001-prd-buzz-saas.md)

## 1. Visão Geral da Funcionalidade

Esta funcionalidade permite que os clientes finais de um negócio interajam com um assistente virtual (chatbot) através do WhatsApp para realizar o ciclo completo de um agendamento. O chatbot é projetado para ser mais prestativo, contextual e inteligente, lidando com múltiplas intenções do usuário.

## 2. Requisitos Funcionais Detalhados

| ID | Requisito | Descrição Detalhada | Status |
| --- | --- | --- | --- |
| FRD01-1 | **Saudação e Início de Conversa** | O chatbot deve iniciar a conversa de forma amigável com um menu de ajuda claro, orientando o usuário sobre suas capacidades. | ✅ Implementado |
| FRD01-2 | **Consulta de Serviços** | O cliente pode perguntar sobre os serviços disponíveis. O chatbot deve responder com uma lista de serviços ativos, incluindo nome e preço. | ✅ Implementado |
| FRD01-3 | **Consulta de Horários de Funcionamento** | O cliente pode perguntar sobre os horários de funcionamento. O chatbot deve retornar os dias e horas em que o estabelecimento está aberto. | ✅ Implementado |
| FRD01-4 | **Verificação de Disponibilidade** | O cliente pode solicitar horários para um serviço em uma data. O chatbot deve apresentar os "slots" de tempo livres de forma amigável. | ✅ Implementado |
| FRD01-5 | **Coleta de Dados para Agendamento** | O chatbot deve ser capaz de extrair ou solicitar as informações necessárias: **Serviço**, **Data** e **Horário**. | ✅ Implementado |
| FRD01-6 | **Criação de Novo Cliente** | Se o número de telefone do cliente não estiver na base, o chatbot deve usar o nome do WhatsApp e criar um novo cliente. | ✅ Implementado |
| FRD01-7 | **Confirmação do Agendamento** | Antes de finalizar, o chatbot deve apresentar um resumo claro e pedir a confirmação explícita do cliente. | ✅ Implementado |
| FRD01-8 | **Persistência do Agendamento** | Após a confirmação, o agendamento é salvo no banco de dados e visível no Dashboard. | ✅ Implementado |
| FRD01-9 | **Consulta de Agendamentos Existentes** | Um cliente pode perguntar sobre seus agendamentos futuros. O chatbot deve listar os agendamentos marcados com detalhes. | ✅ Implementado |
| FRD01-10 | **Cancelamento de Agendamento (Orientação)** | Um cliente pode solicitar o cancelamento. O chatbot orienta o usuário sobre como proceder, listando os agendamentos para fácil identificação. | ✅ Implementado |
| FRD01-11 | **Menu de Ajuda Inteligente**| O chatbot deve responder a "ajuda", "menu", "opções" com um guia claro de seus comandos e funcionalidades. | ✅ Implementado |

## 3. Fluxo de Interação do Usuário (User Flow)

```mermaid
graph TD
    A[Cliente envia qualquer mensagem] --> B[Chatbot: "Olá! Como posso te ajudar? \n- Agendar\n- Meus Agendamentos\n- Ajuda"];
    
    subgraph "Intenções Principais"
        B -- "agendar" --> C(Inicia Fluxo de Agendamento);
        B -- "meus agendamentos" --> D(Consulta e Lista Agendamentos);
        B -- "ajuda" --> E(Mostra Menu de Ajuda Detalhado);
    end

    subgraph "Fluxo de Agendamento"
        C --> F[Chatbot: "Qual serviço você gostaria?"];
        F --> G[Cliente informa o serviço];
        G --> H[Chatbot: "Para qual dia?"];
        H --> I[Cliente informa a data];
        I --> J[Chatbot apresenta horários disponíveis];
        J --> K[Cliente escolhe um horário];
        K --> L[Chatbot: "Confirmando: Serviço, dia X às Y. Certo?"];
        L -- "sim" --> M[Agendamento salvo no DB];
        M --> N[Chatbot: "Agendamento confirmado com sucesso! 🎉"];
        L -- "não" --> O[Chatbot: "Ok, o que gostaria de mudar?"];
    end

    D --> P[Fim da Interação ou Nova Intenção];
    E --> P;
    N --> P;
    O --> P;

```

## 4. Documentos Técnicos Relacionados

-   [LLD: AI Service](../design/004-ai-service-lld.md)
-   [LLD: API de Webhooks](../design/002-webhooks-api-lld.md)
-   [TRD: Integração com Z-API](./004-trd-zapi-integration.md) 