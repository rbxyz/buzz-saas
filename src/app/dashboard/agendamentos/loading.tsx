"use client";
import { AgendamentosSkeleton } from "@/components/loading/agendamentos-skeleton";

// Configurações de cache para pré-carregamento
const PRELOAD_CONFIG = {
  agendamentos: { staleTime: 30 * 1000, cacheTime: 5 * 60 * 1000 },
  clientes: { staleTime: 2 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
  servicos: { staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 },
};

export default function AgendamentosLoading() {
  return <AgendamentosSkeleton />;
}
