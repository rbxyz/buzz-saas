import { ProtectedDocs } from "@/components/docs/protected-docs";

export default function WorkflowPage() {
  return (
    <ProtectedDocs
      title="Workflow de Desenvolvimento"
      description="Guia completo para desenvolvedores sobre processos, padrões e boas práticas da plataforma Buzz SaaS"
    >
      <div className="space-y-8">
        {/* Seção 1: Visão Geral */}
        <section className="bg-gradient-to-r from-brand-primary/5 via-brand-accent/8 to-brand-secondary/5 rounded-2xl p-8 border border-brand-primary/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">🎯 Visão Geral do Workflow</h2>
          <p className="text-muted-foreground mb-6">
            Este documento descreve o fluxo de trabalho padrão para desenvolvimento na plataforma Buzz SaaS, 
            incluindo estrutura de código, padrões de commit, testes e deployment.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-background/50 p-4 rounded-lg border border-border/50">
              <h4 className="font-semibold text-brand-primary mb-2">🚀 Desenvolvimento</h4>
              <p className="text-sm text-muted-foreground">
                Estrutura de branches, padrões de código e configuração local
              </p>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border border-border/50">
              <h4 className="font-semibold text-brand-primary mb-2">🧪 Testes</h4>
              <p className="text-sm text-muted-foreground">
                Estratégias de teste, cobertura e validação de qualidade
              </p>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border border-border/50">
              <h4 className="font-semibold text-brand-primary mb-2">📦 Deploy</h4>
              <p className="text-sm text-muted-foreground">
                Pipeline CI/CD, ambientes e estratégias de release
              </p>
            </div>
          </div>
        </section>

        {/* Seção 2: Estrutura do Projeto */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">📁 Estrutura do Projeto</h2>
          
          <div className="bg-background/90 rounded-xl p-6 border border-border/50 space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Organização de Arquivos</h3>
            
            <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`buzz-saas/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API routes
│   │   ├── dashboard/       # Dashboard pages
│   │   └── docs/           # Documentation
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn/ui components
│   │   ├── dashboard/      # Dashboard-specific
│   │   └── auth/           # Authentication
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utility libraries
│   ├── server/             # Server-side logic
│   │   ├── api/            # tRPC routers
│   │   └── db/             # Database schema
│   └── styles/             # CSS styles
├── docs/                   # Documentation files
│   ├── design/             # System design
│   ├── adr/               # Architecture decisions
│   └── rfc/               # Request for comments
└── scripts/               # Database scripts`}</code>
            </pre>
          </div>
        </section>

        {/* Seção 3: Padrões de Desenvolvimento */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">⚡ Padrões de Desenvolvimento</h2>
          
          <div className="grid gap-6">
            {/* Nomenclatura */}
            <div className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-6 border border-border/50">
              <h3 className="text-xl font-semibold text-foreground mb-4">🏷️ Nomenclatura</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-brand-primary">Componentes React</h4>
                  <p className="text-sm text-muted-foreground">PascalCase: <code>DashboardHeader</code>, <code>UserProfile</code></p>
                </div>
                
                <div>
                  <h4 className="font-medium text-brand-primary">Arquivos</h4>
                  <p className="text-sm text-muted-foreground">kebab-case: <code>user-profile.tsx</code>, <code>api-client.ts</code></p>
                </div>
                
                <div>
                  <h4 className="font-medium text-brand-primary">Funções/Variáveis</h4>
                  <p className="text-sm text-muted-foreground">camelCase: <code>getUserData</code>, <code>isAuthenticated</code></p>
                </div>
              </div>
            </div>

            {/* Estrutura de Commits */}
            <div className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-6 border border-border/50">
              <h3 className="text-xl font-semibold text-foreground mb-4">📝 Padrão de Commits</h3>
              
              <div className="space-y-3">
                <p className="text-muted-foreground">Seguimos o padrão Conventional Commits:</p>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <code className="text-sm">
                    type(scope): description<br/><br/>
                    [optional body]<br/><br/>
                    [optional footer(s)]
                  </code>
                </div>
                
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <strong className="text-brand-primary">Types:</strong>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>• <code>feat</code>: nova funcionalidade</li>
                      <li>• <code>fix</code>: correção de bug</li>
                      <li>• <code>docs</code>: documentação</li>
                      <li>• <code>style</code>: formatação</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-brand-primary">Exemplos:</strong>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>• <code>feat(auth): adicionar login com 2FA</code></li>
                      <li>• <code>fix(dashboard): corrigir layout mobile</code></li>
                      <li>• <code>docs(api): atualizar documentação tRPC</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção 4: Fluxo de Trabalho */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-6">🔄 Fluxo de Trabalho</h2>
          
          <div className="space-y-6">
            {/* Git Flow */}
            <div className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-6 border border-border/50">
              <h3 className="text-xl font-semibold text-foreground mb-4">🌿 Git Flow</h3>
              
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <strong className="text-foreground">Criar branch:</strong>
                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">git checkout -b feature/nome-da-feature</code>
                  </div>
                </li>
                
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <strong className="text-foreground">Desenvolver:</strong> Implementar a funcionalidade seguindo os padrões
                  </div>
                </li>
                
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <strong className="text-foreground">Testar:</strong>
                    <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">npm run check</code>
                  </div>
                </li>
                
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <strong className="text-foreground">Commit:</strong> Seguir padrão Conventional Commits
                  </div>
                </li>
                
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <div>
                    <strong className="text-foreground">Pull Request:</strong> Criar PR para review e merge
                  </div>
                </li>
              </ol>
            </div>

            {/* Checklist de Desenvolvimento */}
            <div className="bg-gradient-to-r from-background to-muted/20 rounded-xl p-6 border border-border/50">
              <h3 className="text-xl font-semibold text-foreground mb-4">✅ Checklist de Desenvolvimento</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-brand-primary mb-3">Antes do Commit</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-border rounded flex-shrink-0"></span>
                      Código testado localmente
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-border rounded flex-shrink-0"></span>
                      ESLint sem erros
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-border rounded flex-shrink-0"></span>
                      TypeScript sem erros
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-border rounded flex-shrink-0"></span>
                      Prettier aplicado
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-brand-primary mb-3">Antes do PR</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-border rounded flex-shrink-0"></span>
                      Branch atualizada com main
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-border rounded flex-shrink-0"></span>
                      Testes passando
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-border rounded flex-shrink-0"></span>
                      Documentação atualizada
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 border border-border rounded flex-shrink-0"></span>
                      Descrição clara do PR
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="text-center pt-8 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            📝 Este documento é atualizado regularmente.<br/>
            Para sugestões ou dúvidas, entre em contato com a equipe de desenvolvimento.
          </p>
        </section>
      </div>
    </ProtectedDocs>
  );
} 