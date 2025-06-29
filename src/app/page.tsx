"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Sparkles, 
  CheckCircle,
  MessageCircle,
  ArrowRight,
  Shield,
  Star,
  Users,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  
  const router = useRouter();
  const { toast } = useToast();
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  // Dados estáticos otimizados
  const features = [
    {
      icon: MessageCircle,
      title: "Agendamento via WhatsApp",
      description: "Seus clientes podem agendar diretamente pelo WhatsApp, de forma rápida e intuitiva."
    },
    {
      icon: Calendar,
      title: "Gestão Inteligente",
      description: "Dashboard completo para gerenciar agendamentos, clientes e horários em um só lugar."
    },
    {
      icon: Shield,
      title: "100% Seguro",
      description: "Seus dados e dos seus clientes estão protegidos com a mais alta segurança."
    }
  ];

  const benefits = [
    { icon: CheckCircle, text: "Reduz cancelamentos em até 80%" },
    { icon: CheckCircle, text: "Aumenta a satisfação dos clientes" },
    { icon: CheckCircle, text: "Economiza tempo da sua equipe" },
    { icon: CheckCircle, text: "Disponível 24/7 para seus clientes" }
  ];

  const stats = [
    { number: "500+", label: "Negócios Atendidos" },
    { number: "50k+", label: "Agendamentos Realizados" },
    { number: "98%", label: "Satisfação dos Clientes" },
    { number: "24/7", label: "Suporte Disponível" }
  ];

  // Mutation para login
  const loginMutation = api.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_data", JSON.stringify(data.user));
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta.",
      });
      router.push("/dashboard");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error.message ?? "Verifique suas credenciais e tente novamente.",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginData.email || !loginData.password) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    loginMutation.mutate(loginData);
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      "Olá! Gostaria de saber mais sobre a plataforma buzz-saas para automatizar os agendamentos do meu negócio."
    );
    window.open(`https://wa.me/5511999999999?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-subtle bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <Image
                src={
                  currentTheme === "dark"
                    ? "/logo-extend-pby-allpines.png"
                    : "/logo-extend-pby-allpines-dark.png"
                }
                alt="Buzz-SaaS Logo"
                width={140}
                height={36}
                className="object-contain"
                priority
              />
          </div>

            <Button
              variant="outline"
              onClick={() => setShowLogin(!showLogin)}
              className="font-medium"
            >
              {showLogin ? "Voltar" : "Área do Cliente"}
            </Button>
          </div>
            </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {showLogin ? (
          /* Login Section */
          <div className="max-w-md mx-auto">
            <Card className="interactive-hover">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-heading-2">
                  Acesse sua conta
                </CardTitle>
                <CardDescription>
                  Entre com suas credenciais para acessar o dashboard
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" variant="required">
                      Email
                          </Label>
                          <Input
                      id="email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="seu@email.com"
                    />
                        </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" variant="required">
                      Senha
                          </Label>
                    <div className="relative">
                          <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Digite sua senha"
                        className="pr-10"
                      />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                                            </Button>
                                          </div>
                                        </div>

                          <Button
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Entrando...
                                </>
                              ) : (
                      "Entrar"
                              )}
                            </Button>
                </form>
              </CardContent>
            </Card>
                          </div>
                        ) : (
          /* Main Landing Content */
          <>
            {/* Hero Section */}
            <section className="text-center py-20">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-light/20 border border-brand-primary/20">
                  <Star className="h-4 w-4 text-brand-primary" />
                  <span className="text-body-small font-medium text-brand-primary">
                    #1 em Agendamento Inteligente
                                    </span>
                                  </div>

                <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
                  Automatize seus
                  <span className="text-brand-primary block">
                    agendamentos
                                        </span>
                  via WhatsApp
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Transforme a experiência dos seus clientes com agendamento automático 
                  via WhatsApp e um dashboard completo para sua gestão.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                  <Button
                    size="lg" 
                    className="text-lg px-8 py-6"
                    onClick={handleWhatsAppContact}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Quero Conhecer
                    <ArrowRight className="h-5 w-5 ml-2" />
                                  </Button>
                  
                          <Button
                            variant="outline"
                    size="lg" 
                    className="text-lg px-8 py-6"
                    onClick={() => setShowLogin(true)}
                  >
                    Ver Demonstração
                          </Button>
                        </div>
                      </div>
            </section>

            {/* Stats */}
            <section className="py-16">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">
                      {stat.number}
                  </div>
                    <div className="text-body-small text-muted-foreground">
                      {stat.label}
                      </div>
                      </div>
                ))}
                      </div>
            </section>

            {/* Features */}
            <section className="py-20">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Tudo que você precisa em um só lugar
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Uma solução completa para transformar como você gerencia agendamentos
                            </p>
                          </div>

              <div className="grid md:grid-cols-3 gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={index} className="interactive-hover text-center p-6">
                      <CardContent className="pt-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-light/20 mx-auto mb-4">
                          <Icon className="h-8 w-8 text-brand-primary" />
                  </div>
                        <h3 className="text-heading-4 font-semibold text-foreground mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-body text-muted-foreground">
                          {feature.description}
                        </p>
            </CardContent>
          </Card>
                  );
                })}
        </div>
      </section>

            {/* Benefits */}
            <section className="py-20 bg-muted/30 rounded-2xl">
              <div className="max-w-4xl mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                      Resultados que você pode esperar
              </h2>
                    <div className="space-y-4">
                      {benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-success shrink-0" />
                          <span className="text-body text-foreground">
                            {benefit.text}
                          </span>
            </div>
                      ))}
                        </div>
                      </div>
                  
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-success/10 border border-success/20 mb-4">
                      <Users className="h-5 w-5 text-success" />
                      <span className="text-body font-medium text-success">
                        Mais de 500 negócios confiam em nós
                      </span>
                        </div>
                    <p className="text-body-small text-muted-foreground">
                      Junte-se aos milhares de empreendedores que já automatizaram 
                      seus agendamentos e aumentaram suas vendas.
                    </p>
                        </div>
                      </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-20 text-center">
              <div className="max-w-3xl mx-auto space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  Pronto para revolucionar seu negócio?
                </h2>
                <p className="text-xl text-muted-foreground">
                  Entre em contato conosco e descubra como podemos ajudar você a automatizar 
                  seus agendamentos e aumentar sua eficiência.
                </p>
                
                  <Button
                  size="lg" 
                  className="text-lg px-12 py-6"
                  onClick={handleWhatsAppContact}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Falar com Especialista
                  <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
          </div>
        </section>
          </>
      )}
      </main>

      {/* Footer */}
      <footer className="border-t border-subtle bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-heading-4 font-bold text-foreground">
              buzz-saas
            </span>
          </div>
          <p className="text-body-small text-muted-foreground">
            © 2024 buzz-saas. Todos os direitos reservados.
          </p>
        </div>
      </footer>
              </div>
  );
}
