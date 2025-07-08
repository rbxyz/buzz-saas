"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProtectedDocsProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function ProtectedDocs({ children, title, description }: ProtectedDocsProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-brand-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-brand-primary animate-pulse" />
            </div>
            <div>
              <CardTitle>Verificando Acesso...</CardTitle>
              <CardDescription>Aguarde enquanto validamos suas credenciais</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">Acesso Restrito</CardTitle>
              <CardDescription>
                Esta documentação está disponível apenas para usuários autenticados.
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
              <h4 className="font-semibold text-sm mb-2">📋 Para acessar:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Faça login na plataforma</li>
                <li>• Acesse com credenciais válidas</li>
                <li>• Usuários admin ou superadmin</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" className="w-full">
                <button className="inline-flex items-center justify-center gap-2 w-full whitespace-nowrap font-medium ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] bg-primary text-primary-foreground shadow-minimal hover:bg-primary/90 hover:shadow-soft h-11 px-5 py-2.5 rounded-lg">
                  Ir para Dashboard
                </button>
              </Link>
              
              <Link href="/docs" className="w-full">
                <button className="inline-flex items-center justify-center gap-2 w-full whitespace-nowrap font-medium ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] border border-subtle bg-background hover:bg-muted/50 hover:text-accent-foreground hover:border-border/80 shadow-minimal h-11 px-5 py-2.5 rounded-lg">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar à Documentação
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header de Segurança */}
      <div className="bg-brand-primary/5 border-b border-brand-primary/20">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center gap-3 text-sm">
            <ShieldCheck className="h-4 w-4 text-brand-primary" />
            <span className="text-brand-primary font-medium">Documentação Protegida</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              Logado como <strong>{user.nome}</strong> ({user.funcao})
            </span>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-brand-primary transition-colors">
            Documentação
          </Link>
          <span>›</span>
          <span className="text-foreground font-medium">{title}</span>
        </nav>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto px-6 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header da Página */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">{title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          {/* Conteúdo Protegido */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 