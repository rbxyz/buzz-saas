"use client";

import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { Overview } from "@/components/dashboard/overview";
import { RecentAppointments } from "@/components/dashboard/recent-appointments";
import { ConfiguracaoInicialAlert } from "@/components/configuracoes/configuracao-inicial-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { BarChart3, FileText, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const isMobile = useIsMobile();

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8">
      {/* Configuração Inicial Alert */}
      <ConfiguracaoInicialAlert />
      
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-display font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-body text-muted-foreground">
          Bem-vindo de volta! Aqui está o resumo do seu negócio hoje.
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList 
          className={cn(
            "grid w-full bg-muted/50 p-1 h-auto",
            isMobile ? "grid-cols-2" : "grid-cols-3"
          )}
        >
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-minimal"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium">Visão Geral</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="analytics" 
            className="flex items-center gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-minimal"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">Análises</span>
          </TabsTrigger>
          
          {!isMobile && (
            <TabsTrigger 
              value="reports" 
              className="flex items-center gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-minimal"
            >
              <FileText className="h-4 w-4" />
              <span className="font-medium">Relatórios</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          {/* Stats Cards */}
          <DashboardStats />

          {/* Charts and Recent Activity */}
          <div className={cn(
            "grid gap-6",
            isMobile ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-7"
          )}>
            {/* Overview Chart */}
            <div className={cn(
              "space-y-1",
              isMobile ? "col-span-1" : "col-span-4"
            )}>
              <div className="mb-4">
                <h3 className="text-heading-3 font-semibold text-foreground">
                  Desempenho
                </h3>
                <p className="text-body-small text-muted-foreground">
                  Acompanhe o crescimento dos seus agendamentos
                </p>
              </div>
              <Overview />
            </div>

            {/* Recent Appointments */}
            <Card className={cn(
              "interactive-hover",
              isMobile ? "col-span-1" : "col-span-3"
            )}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-heading-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/30">
                    <Activity className="h-4 w-4 text-brand-primary" />
                  </div>
                  Atividade Recente
                </CardTitle>
                <p className="text-body-small text-muted-foreground">
                  Seus agendamentos mais recentes
                </p>
              </CardHeader>
              <CardContent>
                <RecentAppointments />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="interactive-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-heading-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/30">
                    <TrendingUp className="h-4 w-4 text-brand-primary" />
                  </div>
                  Análises Detalhadas
                </CardTitle>
                <p className="text-body-small text-muted-foreground">
                  Insights sobre o desempenho do seu negócio
                </p>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-body text-muted-foreground">
                    Análises avançadas em desenvolvimento
                  </p>
                  <p className="text-body-small text-muted-foreground/60 mt-1">
                    Novos relatórios e métricas estarão disponíveis em breve
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="interactive-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-heading-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                    <BarChart3 className="h-4 w-4 text-info" />
                  </div>
                  Métricas de Crescimento
                </CardTitle>
                <p className="text-body-small text-muted-foreground">
                  Acompanhe o crescimento do seu negócio
                </p>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-body text-muted-foreground">
                    Métricas de crescimento em desenvolvimento
                  </p>
                  <p className="text-body-small text-muted-foreground/60 mt-1">
                    Dados históricos e projeções estarão disponíveis em breve
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab (Desktop only) */}
        {!isMobile && (
          <TabsContent value="reports" className="space-y-6">
            <Card className="interactive-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-heading-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/30">
                    <FileText className="h-4 w-4 text-brand-primary" />
                  </div>
                  Relatórios Personalizados
                </CardTitle>
                <p className="text-body-small text-muted-foreground">
                  Gere relatórios detalhados sobre seu negócio
                </p>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <FileText className="h-16 w-16 text-muted-foreground/40 mx-auto mb-6" />
                  <h4 className="text-heading-4 font-semibold text-foreground mb-2">
                    Relatórios Avançados
                  </h4>
                  <p className="text-body text-muted-foreground mb-4">
                    Sistema de relatórios personalizados em desenvolvimento
                  </p>
                  <p className="text-body-small text-muted-foreground/60">
                    Em breve você poderá gerar relatórios detalhados sobre vendas, clientes, 
                    agendamentos e muito mais.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
