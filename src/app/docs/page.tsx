export default function DocsIndex() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 prose dark:prose-invert">
      <h1 className="mb-4">Buzz SaaS – Documentação</h1>

      {/* 1. Visão Geral */}
      <h2 id="visao-geral">Visão Geral</h2>
      <p>
        O <strong>Buzz SaaS</strong> é uma plataforma full-stack para automação de agendamentos via WhatsApp e dashboard web. Ele
        integra chatbot com IA (Groq LLM), API de webhooks (Z-API) e painel administrativo baseado em Next.js App Router.
      </p>

      {/* 2. Instalação */}
      <h2 id="instalacao">Instalação</h2>
      <pre>
        <code>
git clone https://github.com/rbxyz/buzz-saas.git
cd buzz-saas
npm install
        </code>
      </pre>

      {/* 3. Configuração */}
      <h2 id="configuracao">Configuração</h2>
      <p>Crie um arquivo <code>.env</code> na raiz copiando o exemplo:</p>
      <pre>
        <code>cp .env.example .env</code>
      </pre>
      <p>Variáveis essenciais:</p>
      <ul>
        <li><code>DATABASE_URL</code> – string de conexão PostgreSQL</li>
        <li><code>ZAPI_INSTANCE_ID</code>, <code>ZAPI_TOKEN</code>, <code>ZAPI_CLIENT_TOKEN</code> – credenciais WhatsApp</li>
        <li><code>GROQ_API_KEY</code> – chave do LLM</li>
      </ul>

      {/* 4. Como Usar */}
      <h2 id="como-usar">Como Usar</h2>
      <ul>
        <li>
          <strong>Desenvolvimento:</strong> <code>npm run dev</code>
        </li>
        <li>
          <strong>Construir &amp; Preview:</strong> <code>npm run preview</code>
        </li>
        <li>
          <strong>Testes de lint e type-check:</strong> <code>npm run check</code>
        </li>
      </ul>

      {/* 5. API Reference */}
      <h2 id="api-ref">API Reference</h2>
      <p>
        Detalhes de endpoints tRPC e webhooks estão em <a href="/docs/api-reference">/docs/api-reference</a>.
      </p>

      {/* 6. Desenvolvimento */}
      <h2 id="desenvolvimento">Fluxo de Desenvolvimento</h2>
      <p>
        Siga o <a href="/docs/WORKFLOW">Workflow de Documentação</a> e consulte os seguintes documentos:
      </p>
      <ul>
        <li>Design de Sistema (HLD): <code>docs/design/001-system-design-hld.md</code></li>
        <li>LLDs: Webhooks, tRPC, AI Service em <code>docs/design/*</code></li>
        <li>ADRs: decisões arquiteturais em <code>docs/adr/*</code></li>
        <li>RFCs: propostas em <code>docs/rfc/*</code></li>
      </ul>

      {/* 7. Changelog */}
      <h2 id="changelog">Changelog</h2>
      <p>
        Veja as mudanças versão a versão em <a href="/docs/changelog">/docs/changelog</a>.
      </p>
    </main>
  );
} 