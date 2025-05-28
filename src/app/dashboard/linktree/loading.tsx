"use client";

import { useEffect } from "react";
import { api } from "@/trpc/react";
import { LinktreeSkeleton } from "@/components/loading/linktree-skeleton";
import { useRouter } from "next/navigation";

const PRELOAD_CONFIG = {
  linktree: { staleTime: 5 * 60 * 1000, cacheTime: 15 * 60 * 1000 },
};

export default function LinktreeLoading() {
  const router = useRouter();

  // Pré-carrega todos os links
  const { data: links, isLoading: isLoadingLinks } =
    api.linktree.listar.useQuery(undefined, PRELOAD_CONFIG.linktree);

  useEffect(() => {
    if (!isLoadingLinks) {
      const timer = setTimeout(() => {
        router.refresh();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoadingLinks, router]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-muted h-8 w-40 animate-pulse rounded" />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
          Carregando links...
        </div>
      </div>

      <LinktreeSkeleton />

      {/* Progress indicator */}
      <div className="bg-background/80 fixed right-4 bottom-4 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span>
            Carregando linktree...
            {!isLoadingLinks ? " Pronto!" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
