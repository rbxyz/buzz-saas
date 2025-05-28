"use client";

import { useEffect } from "react";
import { api } from "@/trpc/react";
import { ClientesSkeleton } from "@/components/loading/clientes-skeleton";
import { useRouter } from "next/navigation";

const PRELOAD_CONFIG = {
  clientes: { staleTime: 2 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
  historico: { staleTime: 5 * 60 * 1000, cacheTime: 15 * 60 * 1000 },
};

export default function ClientesLoading() {
  const router = useRouter();

  // Pré-carrega lista de clientes
  const { data: clientes, isLoading: isLoadingClientes } =
    api.cliente.listar.useQuery(undefined, PRELOAD_CONFIG.clientes);

  // Pré-carrega histórico dos primeiros clientes para cache
  const { data: historicoPrimeirosClientes } =
    api.agendamento.getHistoricoPorCliente.useQuery(
      { clienteId: clientes?.[0]?.id ?? "" },
      {
        enabled: !!clientes?.[0]?.id,
        ...PRELOAD_CONFIG.historico,
      },
    );

  useEffect(() => {
    if (!isLoadingClientes && clientes) {
      const timer = setTimeout(() => {
        router.refresh();
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isLoadingClientes, clientes, router]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-muted h-8 w-24 animate-pulse rounded" />
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Carregando clientes...
          </div>
        </div>
        <div className="bg-muted h-10 w-32 animate-pulse rounded" />
      </div>

      <ClientesSkeleton />

      {/* Progress indicator */}
      <div className="bg-background/80 fixed right-4 bottom-4 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <span>
            Pré-carregando clientes...
            {!isLoadingClientes ? " Finalizando!" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
