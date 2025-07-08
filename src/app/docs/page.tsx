"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Server, TerminalSquare, GitBranch, Sparkles, Rocket, Code, Database, Settings, Archive, ArrowRight, Star, FileText, Lock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

export default function DocsIndex() {
  const { user } = useAuth();

  const protectedCards = [
    {
      title: "Arquitetura & Design",
      description: "Documentos técnicos detalhados sobre a arquitetura do sistema",
      icon: Server,
      badge: "Avançado",
      badgeVariant: "secondary" as const,
      items: [
        { name: "System Design (HLD)", path: "/docs/design/system-design" },
        { name: "API Webhooks (LLD)", path: "/docs/design/webhooks-api" },
        { name: "tRPC API (LLD)", path: "/docs/design/trpc-api" },
        { name: "AI Service (LLD)", path: "/docs/design/ai-service" }
      ]
    },
    {
      title: "Desenvolvimento",
      description: "Guias para desenvolvedores e fluxos de trabalho",
      icon: Code,
      badge: "Essencial",
      badgeVariant: "default" as const,
      items: [
        { name: "Workflow de Desenvolvimento", path: "/docs/WORKFLOW" },
        { name: "Guias de Cursor Rules", path: "/docs/guides/cursor-rules" },
        { name: "Padrões de Código", path: "/docs/guides/code-patterns" }
      ]
    },
    {
      title: "Decisões Arquiteturais",
      description: "ADRs (Architecture Decision Records) e decisões importantes",
      icon: GitBranch,
      badge: "Histórico",
      badgeVariant: "outline" as const,
      items: [
        { name: "ADR 001: Redis para Cache", path: "/docs/adr/redis-cache" },
        { name: "ADR 002: Webhooks Síncronos", path: "/docs/adr/sync-webhooks" },
        { name: "ADR 003: Refinamentos UI/UX", path: "/docs/adr/ui-ux-refinements" }
      ]
    },
    {
      title: "RFCs & Propostas",
      description: "Propostas de mudanças e funcionalidades futuras",
      icon: Sparkles,
      badge: "Futuro",
      badgeVariant: "secondary" as const,
      items: [
        { name: "RFC 001: Webhooks Assíncronos", path: "/docs/rfc/async-webhooks" },
        { name: "RFC 002: Tool Calling", path: "/docs/rfc/tool-calling" },
        { name: "RFC 003: App Mobile", path: "/docs/rfc/mobile-app" }
      ]
    }
  ];

  const publicCards = [
    {
      title: "API Reference",
      description: "Documentação completa da API tRPC e endpoints webhooks",
      icon: Database,
      badge: "Público",
      badgeVariant: "default" as const,
      path: "/docs/api-reference"
    },
    {
      title: "Changelog",
      description: "Histórico de versões e mudanças do sistema",
      icon: Archive,
      badge: "Público", 
      badgeVariant: "outline" as const,
      path: "/docs/changelog"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 relative overflow-hidden">
      {/* Efeitos de fundo decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-primary/3 via-brand-accent/3 to-brand-secondary/3 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-16">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20">
            <BookOpenCheck className="h-5 w-5 text-brand-primary" />
            <span className="font-semibold text-brand-primary">Documentação Buzz SaaS</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-foreground">
              Plataforma de Agendamentos 
              <span className="bg-gradient-to-r from-brand-primary via-brand-accent to-brand-secondary bg-clip-text text-transparent"> Inteligente</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Automação completa via WhatsApp com IA, dashboard administrativo e integração Z-API. 
              Next.js, tRPC, PostgreSQL e Groq LLM trabalhando em harmonia.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">Next.js 15</Badge>
            <Badge variant="secondary" className="px-3 py-1">tRPC</Badge>
            <Badge variant="secondary" className="px-3 py-1">PostgreSQL</Badge>
            <Badge variant="secondary" className="px-3 py-1">Groq AI</Badge>
            <Badge variant="secondary" className="px-3 py-1">Z-API</Badge>
          </div>
        </div>

        {/* Quick Start Section */}
        <div className="mb-16">
          <div className="bg-gradient-to-r from-brand-primary/5 via-brand-accent/8 to-brand-secondary/5 rounded-3xl p-8 md:p-12 border border-brand-primary/20 backdrop-blur-sm">
            <div className="text-center space-y-6 mb-8">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20">
                <Rocket className="h-5 w-5 text-brand-primary" />
                <span className="font-semibold text-brand-primary">Início Rápido</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground">
                Configure em <span className="text-brand-primary">minutos</span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Instalação */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <TerminalSquare className="h-5 w-5 text-brand-primary" />
                  Instalação
                </h3>
                <div className="bg-background/90 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                  <pre className="text-sm text-foreground/90 leading-relaxed overflow-x-auto">
                    <code>{`# Clone o repositório
git clone https://github.com/rbxyz/buzz-saas.git

# Instale as dependências  
npm install

# Execute o projeto
npm run dev`}</code>
                  </pre>
                </div>
              </div>

              {/* Configuração */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Settings className="h-5 w-5 text-brand-primary" />
                  Configuração
                </h3>
                <div className="space-y-3">
                  <p className="text-muted-foreground">Configure as variáveis essenciais:</p>
                  <div className="bg-background/90 backdrop-blur-sm rounded-xl p-4 border border-border/50 space-y-2">
                    <div className="text-sm">
                      <code className="bg-brand-primary/10 px-2 py-1 rounded text-brand-primary">DATABASE_URL</code>
                      <span className="text-muted-foreground ml-2">PostgreSQL</span>
                    </div>
                    <div className="text-sm">
                      <code className="bg-brand-primary/10 px-2 py-1 rounded text-brand-primary">ZAPI_*</code>
                      <span className="text-muted-foreground ml-2">WhatsApp</span>
                    </div>
                    <div className="text-sm">
                      <code className="bg-brand-primary/10 px-2 py-1 rounded text-brand-primary">GROQ_API_KEY</code>
                      <span className="text-muted-foreground ml-2">IA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documentação Pública */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Documentação <span className="text-brand-primary">Pública</span>
            </h2>
            <p className="text-muted-foreground">Acesso livre para todos os usuários</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {publicCards.map((card, index) => (
              <Card key={index} className="group hover:shadow-2xl hover:shadow-brand-primary/20 transition-all duration-500 border-border/50 hover:border-brand-primary/40 bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-brand-primary/10 rounded-xl group-hover:bg-brand-primary/20 transition-all duration-300">
                        <card.icon className="h-6 w-6 text-brand-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl group-hover:text-brand-primary transition-colors duration-300">
                          {card.title}
                        </CardTitle>
                        <Badge variant={card.badgeVariant} className="mt-1">
                          {card.badge}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <Link href={card.path} className="w-full">
                    <button className="inline-flex items-center justify-center gap-2 w-full whitespace-nowrap font-medium ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] bg-primary text-primary-foreground shadow-minimal hover:bg-primary/90 hover:shadow-soft h-11 px-5 py-2.5 rounded-lg group-hover:bg-brand-primary/90">
                      Acessar
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Documentação Protegida */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
              <Lock className="h-7 w-7 text-brand-primary" />
              Documentação <span className="text-brand-primary">Avançada</span>
            </h2>
            <p className="text-muted-foreground">
              {user ? "Acesso liberado para usuários autenticados" : "Acesso restrito - Faça login para continuar"}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {protectedCards.map((card, index) => (
              <Card key={index} className={`group transition-all duration-500 border-border/50 bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden ${
                user ? 'hover:shadow-2xl hover:shadow-brand-primary/20 hover:border-brand-primary/40' : 'opacity-60'
              }`}>
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-brand-primary/10 rounded-xl group-hover:bg-brand-primary/20 transition-all duration-300">
                        <card.icon className="h-6 w-6 text-brand-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl group-hover:text-brand-primary transition-colors duration-300">
                          {card.title}
                        </CardTitle>
                        <Badge variant={card.badgeVariant} className="mt-1">
                          {card.badge}
                        </Badge>
                      </div>
                    </div>
                    {!user && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {card.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <FileText className="h-4 w-4 text-brand-primary/60" />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                  
                  {user ? (
                    <Link href={index === 1 ? "/docs/workflow" : "#"} className="w-full">
                      <button className="inline-flex items-center justify-center gap-2 w-full whitespace-nowrap font-medium ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] bg-primary text-primary-foreground shadow-minimal hover:bg-primary/90 hover:shadow-soft h-11 px-5 py-2.5 rounded-lg group-hover:bg-brand-primary/90">
                        {index === 1 ? "Explorar Workflow" : "Em Breve"}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </button>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      <span className="flex items-center justify-center gap-2">
                        <Lock className="h-4 w-4" />
                        Acesso Restrito
                      </span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer da Documentação */}
        <div className="text-center pt-12 border-t border-border/40">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4 text-brand-primary" />
              <span>Última atualização: {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Buzz SaaS. Documentação mantida com 
              <span className="text-red-500 mx-1">❤️</span> 
              pela nossa equipe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 