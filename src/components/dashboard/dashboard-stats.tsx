"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageSquare, TrendingUp, Users } from "lucide-react";
import { api } from "@/trpc/react";

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="bg-muted h-4 w-24 rounded"></div>
              <div className="bg-muted h-4 w-4 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted mb-2 h-8 w-16 rounded"></div>
              <div className="bg-muted h-3 w-32 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) return <div>Erro ao carregar estatísticas: {error.message}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className={isStale ? "opacity-75" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Agendamentos Hoje
            {isStale && (
              <span className="text-muted-foreground ml-1 text-xs">
                (atualizando...)
              </span>
            )}
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{agendamentosHoje}</div>
          <p className="text-muted-foreground text-xs">
            {variacaoAgendamentos >= 0 ? "+" : ""}
            {variacaoAgendamentos.toFixed(1)}% vs ontem
          </p>
        </CardContent>
      </Card>

      <Card className={isStale ? "opacity-75" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{novosClientes}</div>
          <p className="text-muted-foreground text-xs">
            {variacaoNovosClientes >= 0 ? "+" : ""}
            {variacaoNovosClientes.toFixed(1)}% vs semana passada
          </p>
        </CardContent>
      </Card>

      <Card className={isStale ? "opacity-75" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Mensagens WhatsApp
          </CardTitle>
          <MessageSquare className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mensagensWhatsApp}</div>
          <p className="text-muted-foreground text-xs">
            {variacaoMensagens >= 0 ? "+" : ""}
            {variacaoMensagens.toFixed(1)}% vs ontem
          </p>
        </CardContent>
      </Card>

      <Card className={isStale ? "opacity-75" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Faturamento Estimado
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {faturamentoEstimado.toLocaleString("pt-BR")}
          </div>
          <p className="text-muted-foreground text-xs">
            {variacaoFaturamento >= 0 ? "+" : ""}
            {variacaoFaturamento.toFixed(1)}% vs semana passada
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
