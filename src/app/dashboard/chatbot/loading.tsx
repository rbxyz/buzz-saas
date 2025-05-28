"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatbotLoading() {
  const router = useRouter();

  // Pré-carrega dados do chatbot se houver
  const { data: configs, isLoading } = api.configuracao.listar.useQuery();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        router.refresh();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, router]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          Carregando chatbot...
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chat Interface */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex space-x-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Progress indicator */}
      <div className="bg-background/80 fixed right-4 bottom-4 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span>
            Carregando chatbot...
            {!isLoading ? " Pronto!" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
