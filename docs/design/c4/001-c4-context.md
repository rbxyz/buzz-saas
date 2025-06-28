# Modelo C4 - Nível 1: Contexto do Sistema

**Status:** Rascunho
**Documento Pai:** [System Design (High-Level)](../001-system-design-hld.md)

## 1. Introdução

Este diagrama de Contexto é a visão de mais alto nível do Modelo C4. Ele mostra o sistema `buzz-saas` como uma "caixa preta" no centro e ilustra como ele interage com seus usuários (atores) e com outros sistemas de software.

O objetivo é apresentar o escopo do sistema sem entrar em detalhes sobre tecnologias ou arquitetura interna.

## 2. Diagrama de Contexto

```mermaid
graph TD
    subgraph " "
        direction TB
        actor "Cliente Final" as Cliente
        actor "Administrador" as Admin
    
        Admin -- "Gerencia agendamentos e<br/>configurações via" --> Sistema
        Cliente -- "Agenda e consulta via" --> ZAPI
    
        Sistema[<div style='font-size: 1.5em; font-weight: bold'>buzz-saas</div><br/>Plataforma de<br/>agendamento inteligente]
    
        ZAPI[<div style='font-weight: bold'>Z-API</div><br/>Gateway de API<br/>para WhatsApp]
        GROQ[<div style='font-weight: bold'>Groq API</div><br/>API de inferência<br/>para o LLM]
    
        Sistema -- "Envia e recebe<br/>mensagens via" --> ZAPI
        Sistema -- "Usa para processar<br/>linguagem natural" --> GROQ
    end

    style Sistema fill:#1168bd,stroke:#0b4882,color:#fff
```

## 3. Atores e Sistemas

| Nome             | Tipo    | Descrição                                                                                                    |
| ---------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| **Administrador**| Ator    | O usuário do sistema que gerencia o negócio. Acessa o `buzz-saas` através do dashboard web para configurar serviços, visualizar agendamentos e gerenciar clientes. |
| **Cliente Final**| Ator    | O cliente do negócio que deseja agendar um serviço. Interage com o `buzz-saas` indiretamente através do WhatsApp. |
| **buzz-saas**    | Sistema | **(O sistema em foco)** Nossa plataforma que orquestra toda a lógica de agendamento, gestão e conversação.      |
| **Z-API**        | Sistema | Dependência externa. Atua como um gateway que permite ao `buzz-saas` enviar e receber mensagens do WhatsApp.     |
| **Groq API**     | Sistema | Dependência externa. Fornece o poder de processamento de linguagem natural (LLM) para entender as mensagens dos clientes e formular respostas. |

</rewritten_file> 