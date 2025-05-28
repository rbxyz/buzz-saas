"use client";

import { useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { DashboardSkeleton } from "@/components/loading/dashboard-skeleton";

const PRELOAD_CONFIG = {
  stats: { staleTime: 30 * 1000, cacheTime: 5 * 60 * 1000 },
  overview: { staleTime: 2 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
  recent: { staleTime: 1 * 60 * 1000, cacheTime: 5 * 60 * 1000 },
};

export default function DashboardLoading() {
  const router = useRouter();

  // Pré-carrega dados do dashboard principal usando endpoints que existem
  const { data: stats, isLoading: isLoadingStats } =
    api.dashboard.getStats.useQuery(undefined, PRELOAD_CONFIG.stats);

  const { data: overview, isLoading: isLoadingOverview } =
    api.dashboard.getOverviewData.useQuery(undefined, PRELOAD_CONFIG.overview);

  const { data: recentAppointments, isLoading: isLoadingRecent } =
    api.dashboard.getUltimosAgendamentos.useQuery(
      undefined,
      PRELOAD_CONFIG.recent,
    );

  useEffect(() => {
    const dadosCarregados =
      !isLoadingStats && !isLoadingOverview && !isLoadingRecent;

    if (dadosCarregados) {
      const timer = setTimeout(() => {
        router.refresh();
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [isLoadingStats, isLoadingOverview, isLoadingRecent, router]);

  return <DashboardSkeleton />;
}
