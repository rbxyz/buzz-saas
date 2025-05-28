"use client";

import { useEffect } from "react";
import { api } from "@/trpc/react";
import { ConfiguracoesSkeleton } from "@/components/loading/configuracoes-skeleton";
import { useRouter } from "next/navigation";

const PRELOAD_CONFIG = {
  configuracoes: { staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 },
  horarios: { staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 },
};

export default function ConfiguracoesLoading() {
  const router = useRouter();

  // Pré-carrega configurações principais
  const { data: configs, isLoading: isLoadingConfigs } =
    api.configuracao.listar.useQuery(undefined, PRELOAD_CONFIG.configuracoes);

  // Pré-carrega horários personalizados
  const { data: horariosPersonalizados, isLoading: isLoadingHorarios } =
    api.configuracao.getHorariosPersonalizados.useQuery(
      undefined,
      PRELOAD_CONFIG.horarios,
    );

  useEffect(() => {
    if (!isLoadingConfigs && !isLoadingHorarios) {
      const timer = setTimeout(() => {
        router.refresh();
      }, 1000); // Mais tempo pois são muitos dados

      return () => clearTimeout(timer);
    }
  }, [isLoadingConfigs, isLoadingHorarios, router]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-muted h-8 w-32 animate-pulse rounded" />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
          Carregando configurações...
        </div>
      </div>

      <ConfiguracoesSkeleton />

      {/* Progress indicator */}
      <div className="bg-background/80 fixed right-4 bottom-4 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <span>
            Carregando configurações...
            {!isLoadingConfigs && !isLoadingHorarios ? " Finalizando!" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
