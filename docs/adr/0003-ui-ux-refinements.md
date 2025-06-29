# ADR 0003: Refinamentos de UI/UX e Funcionalidades

**Status:** Aceito

## Contexto

Com base no feedback e na evolução do produto, foram identificadas três áreas para melhoria e simplificação da interface de administração:
1.  A seção "Linktree" continha uma distinção entre "Clientes" e "Parcerias" que se mostrou desnecessária, simplificando o foco da funcionalidade.
2.  A página do "Chatbot" permitia o envio de mensagens pelo administrador, uma funcionalidade que não se alinha com o propósito principal da ferramenta, que é ser um log de visualização das interações do bot.
3.  A identidade visual da aplicação era estática, não permitindo que os clientes (donos dos estabelecimentos) personalizassem as cores para alinhá-las com suas próprias marcas.

## Decisão

Foram implementadas as seguintes alterações:

1.  **Simplificação do Linktree:** A funcionalidade de "Clientes" foi removida da página de Linktree. A página agora foca exclusivamente no gerenciamento de links de "Parcerias", tornando seu propósito mais claro e a interface mais limpa.

2.  **Chatbot como Visualizador:** O campo de entrada de texto e a funcionalidade de envio de mensagens foram removidos da página do Chatbot. A interface agora serve estritamente como um log de leitura das conversas, prevenindo interações manuais e reforçando seu papel de monitoramento.

3.  **Implementação de Temas de Cores Dinâmicos:** Foi criado um novo componente na página de configurações (`CoresCard`) que permite ao administrador customizar as cores da aplicação.
    -   **Funcionalidades:** Permite a seleção de temas pré-definidos e a customização manual das cores primária, secundária e de destaque.
    -   **Persistência:** As cores escolhidas são salvas no `localStorage` do navegador e aplicadas dinamicamente às variáveis CSS globais, garantindo que o tema do usuário persista entre as sessões.

## Consequências

### Positivas

-   **Melhora na Usabilidade:** As interfaces do Linktree e do Chatbot estão mais simples e focadas em seus objetivos principais.
-   **Aumento da Personalização:** A capacidade de customizar cores aumenta o valor percebido do SaaS, permitindo que os clientes tenham uma experiência mais integrada com sua própria marca.
-   **Manutenibilidade:** A remoção de funcionalidades não essenciais (envio no chatbot) simplifica a base de código.
-   **Consistência Técnica:** A implementação do seletor de cores utiliza o `localStorage` e variáveis CSS, uma abordagem moderna e eficiente que não requer alterações no banco de dados para uma preferência de UI.

### Negativas e Mitigações

-   **Nenhuma consequência negativa significativa foi identificada.** As funcionalidades removidas eram de baixo impacto ou desalinhadas com os objetivos do produto. A nova funcionalidade de cores é aditiva e não interfere com as operações existentes. 