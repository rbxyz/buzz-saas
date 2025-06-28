# RFC 002: Refatorar AIService para usar Tool Calling

-   **Autor(es):**
-   **Status:** Rascunho
-   **Data de Criação:** YYYY-MM-DD
-   **Documentos Relacionados:** [LLD: AI Service](../design/004-ai-service-lld.md)

## 1. Resumo (Summary)

Propõe-se a refatoração do `AIService` para utilizar a funcionalidade de **Tool Calling** (ou Function Calling) da Vercel AI SDK. Em vez de usarmos uma lógica manual (`detectAction`) para extrair intenções da mensagem do usuário, delegaremos essa responsabilidade ao modelo de linguagem (LLM).

O LLM será instruído a, quando identificar uma intenção específica (como "agendar" ou "listar serviços"), responder com uma chamada de "ferramenta" estruturada em JSON, contendo a ação a ser executada e os parâmetros extraídos da conversa (ex: data, nome do serviço).

## 2. Motivação (Motivation)

-   **Robustez e Precisão:** A extração de intenções baseada em palavras-chave (`detectAction`) é frágil. Ela pode falhar com frases mais complexas ou ambíguas. Os LLMs são muito mais capazes de entender o contexto e extrair entidades com precisão.
-   **Simplificação do Código:** Remove a necessidade de mantermos a lógica manual de `detectAction`, tornando o `AIService` mais limpo, declarativo e fácil de manter. Toda a "gramática" das ações possíveis fica definida junto à chamada do LLM.
-   **Extensibilidade:** Adicionar novas ações se torna muito mais simples. Em vez de adicionar mais `if/else` na detecção, apenas definimos uma nova "ferramenta" para o LLM e a função correspondente para executá-la.

## 3. Proposta Detalhada (Detailed Design)

A mudança principal ocorrerá no método `processMessage` do `AIService`.

**1. Definição das Ferramentas (Tools):**
   - Definiremos um conjunto de ferramentas que o LLM pode "chamar". Cada ferramenta corresponde a uma ação de negócio.

   ```typescript
   // Exemplo de definição de ferramentas
   import { z } from 'zod';

   const tools = {
     listarServicos: {
       description: 'Lista todos os serviços disponíveis para o cliente.',
     },
     listarHorarios: {
       description: 'Lista os horários disponíveis para um serviço em uma data específica.',
       parameters: z.object({
         servico: z.string().describe('O nome do serviço desejado.'),
         data: z.string().describe('A data para a verificação, formato AAAA-MM-DD.'),
       }),
     },
     // ... outras ferramentas como criarAgendamento, etc.
   };
   ```

**2. Chamada à API com `generateText`:**
   - A chamada ao `generateText` será modificada para incluir o `tools`. O SDK da Vercel AI cuidará da formatação do prompt para que o LLM entenda as ferramentas disponíveis.

   ```typescript
   // Exemplo em AIService.processMessage
   import { generateText } from 'ai';

   const result = await generateText({
     model: this.model,
     messages: [...],
     tools, // Passando as ferramentas para o modelo
   });
   ```

**3. Processamento do Resultado:**
   - O resultado de `generateText` não será apenas texto, mas um objeto que pode conter chamadas a ferramentas.
   - Iremos iterar sobre as chamadas de ferramenta e executar a lógica correspondente.

   ```typescript
   // Exemplo de processamento
   for (const toolCall of result.toolCalls) {
     switch (toolCall.toolName) {
       case 'listarServicos': {
         // Executar a lógica para listar serviços...
         break;
       }
       case 'listarHorarios': {
         const { servico, data } = toolCall.args;
         // Executar a lógica para listar horários com os argumentos...
         break;
       }
     }
   }
   ```

Isso elimina completamente a necessidade da função `detectAction` e da lógica manual de extração de parâmetros.

## 4. Desafios e Alternativas

-   **Confiança no LLM:** A qualidade da extração de parâmetros agora depende inteiramente da capacidade do LLM. Modelos menos capazes podem ter dificuldades. No entanto, modelos modernos como Llama 3.1 são excelentes nisso.
-   **Custo:** Chamadas com `tools` podem consumir um pouco mais de tokens. O custo adicional é marginal e justificado pela robustez e simplicidade do código.
-   **Alternativa (Manter `detectAction`):** Rejeitada por ser menos robusta e mais difícil de manter a longo prazo, como já discutido.

## 5. Plano de Implementação

1.  Definir os schemas Zod para todas as ações de negócio (`listarServicos`, `criarAgendamento`, etc.).
2.  Refatorar o método `processMessage` para usar o `generateText` com o parâmetro `tools`.
3.  Remover a função `detectAction` e toda a lógica de extração manual de entidades.
4.  Implementar o `switch` para lidar com as `toolCalls` retornadas pelo modelo.
5.  Realizar testes extensivos com diferentes frases de usuário para garantir que o LLM extrai os parâmetros corretamente. 