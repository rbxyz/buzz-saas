import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Documentação | Buzz SaaS",
  description: "Documentação completa da plataforma Buzz SaaS",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        {/* Header da Documentação */}
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-brand-primary" />
              <div className="font-semibold text-foreground">
                <Link href="/docs" className="hover:text-brand-primary transition-colors">
                  Buzz SaaS Docs
                </Link>
              </div>
            </div>
            
            <Link href="/dashboard">
              <button className="inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] border border-subtle bg-background hover:bg-muted/50 hover:text-accent-foreground hover:border-border/80 shadow-minimal h-9 rounded-md px-4 text-caption">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </button>
            </Link>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
} 