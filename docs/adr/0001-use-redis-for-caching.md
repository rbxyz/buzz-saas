# ADR 0001: Uso de Redis para Cache

**Status:** Aceito

## Contexto

Com o crescimento da aplicação `buzz-saas`, prevemos um aumento significativo no tráfego de usuários e na quantidade de requisições. Atualmente, todas as leituras de dados são feitas diretamente no banco de dados principal (PostgreSQL). Algumas dessas consultas são computacionalmente caras e executadas com frequência, como a busca por configurações, dados de agendamentos e informações de usuários.

Isso resulta em:
- Aumento da latência nas respostas da API.
- Carga elevada no banco de dados, podendo se tornar um gargalo de performance.
- Custos maiores com o banco de dados para escalar verticalmente.

Para mitigar esses problemas, precisamos de uma estratégia de cache para armazenar em memória os dados acessados com frequência, melhorando a performance e a escalabilidade do sistema.

## Decisão

Adotaremos o **Redis** como nosso sistema de cache distribuído em memória.

As principais diretrizes para sua utilização serão:

1.  **Estratégia de Cache:** Utilizaremos o padrão **Cache-Aside (Lazy Loading)**.
    - A aplicação buscará primeiro o dado no Redis.
    - Se o dado existir (cache hit), ele será retornado diretamente.
    - Se o dado não existir (cache miss), a aplicação buscará no banco de dados, armazenará o resultado no Redis com um TTL (Time-To-Live) e o retornará.

2.  **Dados a serem cacheados:**
    - Resultados de consultas de banco de dados que são lidas com frequência e raramente alteradas (ex: configurações do sistema, lista de serviços).
    - Sessões de usuário.
    - Dados de dashboards que não necessitam de tempo real estrito.

3.  **Invalidação de Cache:**
    - A principal estratégia será baseada em TTL, definido de acordo com a volatilidade do dado.
    - Para dados que precisam de consistência maior, implementaremos uma invalidação explícita (write-through ou remoção explícita no momento da atualização do dado no banco).

4.  **Infraestrutura:**
    - O Redis será configurado em um serviço gerenciado (como AWS ElastiCache, Vercel KV ou Upstash) para simplificar a manutenção, monitoramento e garantir alta disponibilidade.

## Consequências

### Positivas

- **Melhora de Performance:** Redução drástica na latência para leituras de dados cacheados.
- **Redução da Carga no Banco de Dados:** Diminuição do número de queries no PostgreSQL, permitindo que ele se concentre em operações de escrita e consultas complexas.
- **Escalabilidade:** Aumenta a capacidade do sistema de lidar com picos de tráfego sem degradar a performance.
- **Flexibilidade:** Redis oferece estruturas de dados versáteis (hashes, lists, sets) que podem ser aproveitadas para diferentes necessidades de cache no futuro.

### Negativas e Mitigações

- **Complexidade Adicional:**
    - **Problema:** Introduz um novo componente na arquitetura, exigindo configuração, monitoramento e manutenção.
    - **Mitigação:** Utilizar um serviço de Redis gerenciado para abstrair a complexidade da infraestrutura. A lógica de cache será encapsulada em módulos específicos no código para ser reutilizável e fácil de manter.

- **Consistência de Dados:**
    - **Problema:** Risco de dados obsoletos (stale data) no cache.
    - **Mitigação:** Definir TTLs curtos e apropriados para cada tipo de dado. Implementar estratégias de invalidação explícita para dados críticos quando forem atualizados.

- **Ponto Único de Falha (Single Point of Failure):**
    - **Problema:** Se a instância do Redis ficar indisponível, a performance da aplicação será degradada, pois todas as requisições irão para o banco de dados.
    - **Mitigação:** Configurar o serviço de Redis gerenciado com alta disponibilidade (replicação e failover automático). A aplicação deve ser resiliente e continuar funcionando (ainda que mais lentamente) caso o cache esteja indisponível.

- **Custos de Infraestrutura:**
    - **Problema:** Custo adicional para o serviço de Redis.
    - **Mitigação:** O custo é justificado pela melhora de performance e pela redução da necessidade de escalar o banco de dados, que geralmente é mais caro. O dimensionamento da instância do Redis será feito com base na análise de uso para otimizar os custos. 