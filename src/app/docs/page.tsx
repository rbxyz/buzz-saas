export default function DocsIndex() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose dark:prose-invert">
      <h1>Documentação</h1>
      <p>Bem-vindo à área de documentação interna do <strong>Buzz SaaS</strong>.</p>

      <h2>Seções</h2>
      <ul>
        <li>
          <a href="/docs/api-reference">API Reference</a> <em>(em construção)</em>
        </li>
        <li>
          <a href="/docs/changelog">Changelog</a>
        </li>
      </ul>

      <p>
        Esta página serve como índice inicial para futuras seções de docs. Siga as boas práticas descritas em
        <code>docs/WORKFLOW.md</code> ao adicionar novos conteúdos.
      </p>
    </main>
  );
} 