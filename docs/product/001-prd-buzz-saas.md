# PRD: buzz-saas - Plataforma de Agendamento Inteligente

**Status:** Rascunho
**Autor(es):** 
**Revisado por:** 

## 1. Visão Geral e Objetivo

O `buzz-saas` é uma plataforma de Software as a Service (SaaS) que visa simplificar e automatizar a gestão de agendamentos para prestadores de serviço (salões de beleza, barbearias, clínicas, etc.).

O objetivo principal é duplo:
1.  **Para o Negócio:** Reduzir a carga de trabalho manual, eliminar conflitos de agendamento e fornecer insights sobre a operação através de um dashboard centralizado.
2.  **Para o Cliente Final:** Oferecer uma experiência de agendamento moderna, conveniente e instantânea através de canais familiares como o WhatsApp.

## 2. Escopo e Funcionalidades Chave (RFs - Requisitos Funcionais)

| ID   | Funcionalidade                     | Descrição Resumida                                                                                                | Prioridade |
| ---- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| RF01 | **Agendamento via Chatbot**        | Clientes podem consultar serviços, verificar horários e agendar através de um chatbot no WhatsApp.                | Essencial  |
| RF02 | **Dashboard de Gestão**            | Administradores têm acesso a um painel para visualizar e gerenciar agendamentos, clientes e configurações.          | Essencial  |
| RF03 | **Gestão de Serviços**             | Capacidade de criar, editar, ativar e desativar os serviços oferecidos, incluindo nome, preço e duração.          | Essencial  |
| RF04 | **Gestão de Horários**             | Definir os horários de trabalho e folgas para controlar a disponibilidade.                                        | Essencial  |
| RF05 | **Gestão de Clientes**             | Visualizar a lista de clientes, seu histórico de agendamentos e informações de contato.                           | Essencial  |
| RF06 | **Página Pública (Linktree)**      | Uma página de link pública que pode ser compartilhada para direcionar os clientes para agendamento ou redes sociais. | Média      |
| RF07 | **Notificações Automáticas**       | (Futuro) Envio de lembretes e confirmações de agendamento via WhatsApp.                                           | Alta       |

## 3. Requisitos Não-Funcionais (RNFs)

-   **Desempenho:** A resposta do chatbot deve ser quase instantânea (< 3 segundos). O dashboard deve carregar em menos de 2 segundos.
-   **Disponibilidade:** O sistema deve ter uma disponibilidade de 99.9%.
-   **Segurança:** A comunicação entre frontend e backend deve ser criptografada (HTTPS, WSS). Dados sensíveis de clientes devem ser armazenados de forma segura.
-   **Escalabilidade:** A arquitetura deve suportar um aumento de 10x no número de clientes e agendamentos sem degradação de performance.

## 4. Métricas de Sucesso

-   Número de agendamentos realizados via chatbot por mês.
-   Taxa de sucesso de conversas do chatbot (agendamentos concluídos vs. conversas iniciadas).
-   Tempo médio para um novo usuário configurar a plataforma.
-   Taxa de retenção de clientes (negócios que continuam usando a plataforma após 3 meses).

## 5. Documentos Relacionados

-   [FRD: Agendamento via Chatbot](./002-frd-chatbot-scheduling.md)
-   [FRD: Dashboard de Gestão](./003-frd-admin-dashboard.md)
-   [TRD: Integração com Z-API](./004-trd-zapi-integration.md) 