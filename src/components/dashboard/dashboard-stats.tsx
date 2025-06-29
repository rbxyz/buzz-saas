"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageSquare, TrendingUp, Users } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

export function DashboardStats() {
  // Query otimizada com cache de 30 segundos
  const { data, isLoading, error, isStale } = api.dashboard.getStats.useQuery(
    undefined,
    {
      staleTime: 30 * 1000, // 30 segundos
      gcTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
      refetchInterval: 60 * 1000, // Atualiza a cada minuto
    },
  );

  // Estados locais para métricas derivadas
  const [agendamentosHoje, setAgendamentosHoje] = useState(0);
  const [novosClientes, setNovosClientes] = useState(0);
  const [mensagensWhatsApp, setMensagensWhatsApp] = useState(0);
  const [faturamentoEstimado, setFaturamentoEstimado] = useState(0);

  const [variacaoAgendamentos, setVariacaoAgendamentos] = useState(0);
  const [variacaoNovosClientes, setVariacaoNovosClientes] = useState(0);
  const [variacaoMensagens, setVariacaoMensagens] = useState(0);
  const [variacaoFaturamento, setVariacaoFaturamento] = useState(0);

  // Atualizar estados locais quando os dados do backend chegarem
  useEffect(() => {
    if (!data) return;

    setAgendamentosHoje(data.agendamentosHoje ?? 0);
    setNovosClientes(data.novosClientes ?? 0);
    setMensagensWhatsApp(data.mensagensWhatsApp ?? 0);
    setFaturamentoEstimado(data.faturamentoEstimado ?? 0);

    setVariacaoAgendamentos(data.variacaoAgendamentos ?? 0);
    setVariacaoNovosClientes(data.variacaoNovosClientes ?? 0);
    setVariacaoMensagens(data.variacaoMensagens ?? 0);
    setVariacaoFaturamento(data.variacaoFaturamento ?? 0);
  }, [data]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="h-4 w-24 bg-muted rounded-md"></div>
              <div className="h-5 w-5 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded-md mb-2"></div>
              <div className="h-3 w-32 bg-muted rounded-md"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) return <div>Erro ao carregar estatísticas: {error.message}</div>;

  const stats = [
    {
      title: "Agendamentos Hoje",
      value: agendamentosHoje,
      change: variacaoAgendamentos,
      changeLabel: "vs ontem",
      icon: Calendar,
      iconColor: "text-brand-primary",
      iconBg: "bg-brand-light/50",
    },
    {
      title: "Novos Clientes",
      value: `+${novosClientes}`,
      change: variacaoNovosClientes,
      changeLabel: "vs semana passada",
      icon: Users,
      iconColor: "text-success",
      iconBg: "bg-success/10",
    },
    {
      title: "Mensagens WhatsApp",
      value: mensagensWhatsApp,
      change: variacaoMensagens,
      changeLabel: "vs ontem",
      icon: MessageSquare,
      iconColor: "text-info",
      iconBg: "bg-info/10",
    },
    {
      title: "Faturamento Estimado",
      value: `R$ ${faturamentoEstimado.toLocaleString("pt-BR")}`,
      change: variacaoFaturamento,
      changeLabel: "vs semana passada",
      icon: TrendingUp,
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const isPositive = stat.change >= 0;
        
        return (
          <Card 
            key={index} 
            className={cn(
              "interactive-hover",
              isStale && "opacity-75"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-body-small font-medium text-muted-foreground">
                {stat.title}
                {isStale && (
                  <span className="ml-2 text-caption text-muted-foreground/60">
                    (atualizando...)
                  </span>
                )}
              </CardTitle>
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                stat.iconBg
              )}>
                <Icon className={cn("h-4 w-4", stat.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-heading-2 font-bold text-foreground mb-2">
                {stat.value}
              </div>
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-caption font-medium",
                  isPositive ? "text-success" : "text-destructive"
                )}>
                  {isPositive ? "+" : ""}{stat.change.toFixed(1)}%
                </span>
                <span className="text-caption text-muted-foreground">
                  {stat.changeLabel}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
