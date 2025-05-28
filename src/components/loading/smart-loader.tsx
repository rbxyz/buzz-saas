"use client";

import type React from "react";

import { usePreloadData } from "@/hooks/use-preload-data";
import { useEffect, useState } from "react";

interface SmartLoaderProps {
  page:
    | "dashboard"
    | "agendamentos"
    | "clientes"
    | "linktree"
    | "configuracoes"
    | "chatbot";
  children: React.ReactNode;
  minLoadingTime?: number; // tempo mínimo de loading em ms
}

export function SmartLoader({
  page,
  children,
  minLoadingTime = 800,
}: SmartLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Configura o pré-carregamento baseado na página
  const preloadConfig = {
    [page]: true,
  };

  usePreloadData(preloadConfig);

  useEffect(() => {
    // Garante um tempo mínimo de loading para melhor UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, [minLoadingTime]);

  if (isLoading) {
    return <>{children}</>;
  }

  return null;
}
