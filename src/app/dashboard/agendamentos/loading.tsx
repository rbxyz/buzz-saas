"use client";

import { useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";

// Configurações de cache para pré-carregamento
const PRELOAD_CONFIG = {
  agendamentos: { staleTime: 30 * 1000, cacheTime: 5 * 60 * 1000 },
  clientes: { staleTime: 2 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
  servicos: { staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 },
};

export default function AgendamentosLoading() {
  const router = useRouter();
  const today = new Date();

  // Pré-carrega dados críticos para agendamentos
  const { data: cortesDoMes, isLoading: isLoadingCortes } =
    trpc.agendamento.getCortesDoMes.useQuery(
      {
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      },
      PRELOAD_CONFIG.agendamentos,
    );

  const { data: agendamentosHoje, isLoading: isLoadingAgendamentos } =
    trpc.agendamento.getByData.useQuery(
      { date: today.toISOString() },
      PRELOAD_CONFIG.agendamentos,
    );

  const { data: servicosDisponiveis, isLoading: isLoadingServicos } =
    trpc.configuracao.getServicos.useQuery(undefined, PRELOAD_CONFIG.servicos);

  // Pré-carrega alguns clientes para busca rápida
  const { data: clientesRecentes } = trpc.cliente.listar.useQuery(
    undefined,
    PRELOAD_CONFIG.clientes,
  );

  // Quando todos os dados críticos estiverem carregados, redireciona para a página
  useEffect(() => {
    const dadosCriticosCarregados =
      !isLoadingCortes && !isLoadingAgendamentos && !isLoadingServicos;

    if (dadosCriticosCarregados) {
      // Pequeno delay para mostrar o skeleton e dar sensação de carregamento
      const timer = setTimeout(() => {
        // Força refresh da página para usar os dados em cache
        router.refresh();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isLoadingCortes, isLoadingAgendamentos, isLoadingServicos, router]);

  return (
    <div className="space-y-6 p-6">
      {/* Header com indicador de carregamento */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-32" />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          Carregando agendamentos...
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        {/* Skeleton do Calendário */}
        <Card className="w-full max-w-full">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="flex flex-col gap-6 md:flex-row">
            {/* Calendário */}
            <div className="w-full md:w-1/2">
              <Skeleton className="mb-2 h-6 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-8" />
                  ))}
                </div>
              </div>
            </div>

            {/* Cortes do mês */}
            <div className="w-full md:w-1/2">
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="mb-4 h-4 w-40" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skeleton da Lista de Agendamentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-9 w-20" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded border p-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Indicador de progresso */}
      <div className="bg-background/80 fixed right-4 bottom-4 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
          <span>
            Pré-carregando dados...
            {!isLoadingCortes && !isLoadingAgendamentos && !isLoadingServicos
              ? " Quase pronto!"
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
