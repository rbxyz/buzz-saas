# RFC 003: Estratégia de App Mobile via WebView com Capacitor.js

-   **Autor(es):** 
-   **Status:** Rascunho
-   **Data de Criação:** 2024-07-01
-   **Documentos Relacionados:** [System Design (High-Level)](../design/001-system-design-hld.md)

## 1. Resumo (Summary)

Propõe-se a criação de aplicativos móveis nativos para iOS e Android para o `buzz-saas`. Em vez de desenvolver aplicativos nativos do zero, utilizaremos uma abordagem híbrida, "empacotando" nossa aplicação web existente, que já é responsiva, em uma WebView nativa. A tecnologia escolhida para essa tarefa é o **Capacitor.js**, um sucessor espiritual do Cordova, projetado para aplicações web modernas.

## 2. Motivação (Motivation)

-   **Presença nas Lojas de Aplicativos:** Ter o `buzz-saas` na Apple App Store e na Google Play Store aumenta a visibilidade, credibilidade e facilita o acesso para os usuários administradores.
-   **Rápido Time-to-Market:** Esta abordagem nos permite reutilizar 99% da nossa base de código existente, reduzindo drasticamente o tempo e o custo de desenvolvimento em comparação com a criação de dois aplicativos nativos separados.
-   **Acesso a APIs Nativas:** O Capacitor nos permite acessar funcionalidades nativas do dispositivo, como **notificações push**, que são cruciais para agregar valor ao aplicativo (ex: alertas de novos agendamentos).
-   **Manutenção Unificada:** A maior parte das atualizações e novas funcionalidades será desenvolvida uma única vez na base de código web e refletida automaticamente nos aplicativos móveis.

## 3. Proposta Detalhada (Detailed Design)

A estratégia será implementada em fases, utilizando o Capacitor.js para criar uma ponte entre nossa aplicação Next.js e as plataformas nativas.

**Fase 1: Preparação do Projeto Web**
-   **Saída Estática:** A aplicação Next.js será configurada para gerar uma exportação estática (`next build && next export` ou a configuração de saída `output: 'export'` no `next.config.js`). O Capacitor irá empacotar o conteúdo do diretório `out/`.
-   **Autenticação:** Revisar e garantir que o sistema de autenticação (tokens/cookies) funcione de forma confiável dentro do ambiente de uma WebView. O Capacitor gerencia isso bem, mas testes são necessários.

**Fase 2: Integração com Capacitor**
1.  **Instalação:** Adicionar o Capacitor como uma dependência de desenvolvimento ao projeto.
    ```bash
    npm install @capacitor/core @capacitor/cli
    ```
2.  **Inicialização:** Inicializar o Capacitor, configurando o `webDir` para apontar para a pasta de build estático (`out`).
    ```bash
    npx cap init "Buzz SaaS" "com.buzzsaas.app" --web-dir=out
    ```
3.  **Adição de Plataformas:** Adicionar os projetos nativos de iOS e Android ao nosso repositório.
    ```bash
    npm install @capacitor/ios @capacitor/android
    npx cap add ios
    npx cap add android
    ```
    Isso criará as pastas `ios/` e `android/` com os respectivos projetos nativos.

**Fase 3: Adição de Funcionalidades Nativas (Essencial para Aprovação)**
-   **Requisito:** A Apple, em particular, pode rejeitar aplicativos que são apenas "invólucros" de um site. Para mitigar isso, devemos integrar funcionalidades nativas que justifiquem a presença na loja.
-   **Notificações Push:** Implementar o plugin `@capacitor/push-notifications` para enviar alertas de agendamentos, lembretes, etc. Esta é a funcionalidade de maior valor agregado.
-   **Ícone e Splash Screen:** Configurar o ícone do aplicativo e uma tela de abertura (splash screen) usando `@capacitor/splash-screen` para uma experiência de inicialização profissional.
-   **Barra de Status:** Utilizar `@capacitor/status-bar` para controlar a aparência da barra de status do dispositivo (cores, estilo) para que ela se integre ao design do nosso app.

**Fase 4: Processo de Build e Publicação**
1.  **Script de Build:** Criar um script no `package.json` que automatize o processo: `next build && next export && npx cap sync`.
2.  **iOS:**
    -   Abrir o projeto iOS (`npx cap open ios`) no Xcode.
    -   Configurar a assinatura digital (requer uma conta de desenvolvedor da Apple).
    -   Compilar, arquivar e enviar para a App Store Connect para revisão.
3.  **Android:**
    -   Abrir o projeto Android (`npx cap open android`) no Android Studio.
    -   Gerar um Android App Bundle (`.aab`) assinado.
    -   Fazer o upload para o Google Play Console.

## 4. Desafios e Alternativas (Drawbacks and Alternatives)

-   **Desempenho:** O desempenho será o de uma aplicação web, não de uma aplicação totalmente nativa. Para o nosso caso de uso (um dashboard de gerenciamento), isso é perfeitamente aceitável.
-   **Experiência do Usuário (UX):** A UX pode não parecer 100% "nativa" em termos de transições de tela e padrões de UI específicos da plataforma. A qualidade da nossa UI responsiva existente minimiza esse problema.
-   **Rejeição nas Lojas:** Este é o principal risco. A mitigação é focar na Fase 3, adicionando funcionalidades nativas úteis que justifiquem a existência do app além do site.
-   **Alternativa 1 (PWA):** Um Progressive Web App pode ser "instalado" na tela inicial, mas não é distribuído pelas lojas e tem acesso mais limitado às APIs nativas (especialmente no iOS). Rejeitada por não cumprir o requisito de presença nas lojas.
-   **Alternativa 2 (Desenvolvimento Nativo ou React Native/Flutter):** Criar apps "reais" do zero. Rejeitada devido ao alto custo, tempo de desenvolvimento e necessidade de manter bases de código separadas.

## 5. Plano de Implementação (Adoption Strategy)

A implementação pode ser feita de forma incremental, sem afetar a aplicação web existente. A proposta é criar uma `feature-branch` para a integração do Capacitor e seguir as fases descritas. Uma PoC (Prova de Conceito) pode ser desenvolvida rapidamente para validar o fluxo em um dispositivo de teste. 