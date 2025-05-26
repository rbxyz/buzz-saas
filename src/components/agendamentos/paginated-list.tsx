"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptimizedQuery } from "@/hooks/use-optimized-query";
import { api } from "@/trpc/react";
import { CACHE_KEYS } from "@/lib/cache-config";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  DollarSign,
} from "lucide-react";
import dayjs from "dayjs";

interface PaginatedAgendamentosProps {
  status?: "agendado" | "cancelado" | "concluido";
  dataInicio?: string;
  dataFim?: string;
}

export function PaginatedAgendamentos({
  status,
  dataInicio,
  dataFim,
}: PaginatedAgendamentosProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error, isStale } = useOptimizedQuery(
    [
      CACHE_KEYS.AGENDAMENTOS,
      "paginated",
      currentPage.toString(),
      status ?? "all",
      dataInicio ?? "",
      dataFim ?? "",
    ],
    () =>
      api.agendamentoOptimized.getAgendamentosPaginados.query({
        page: currentPage,
        limit: pageSize,
        status,
        dataInicio,
        dataFim,
      }),
    {
      cacheType: "DYNAMIC_DATA",
      enabled: true,
    },
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return dayjs(date).format("DD/MM/YYYY HH:mm");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado":
        return "default";
      case "concluido":
        return "secondary";
      case "cancelado":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            Erro ao carregar agendamentos. Tente novamente.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isStale ? "opacity-75" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agendamentos
          {data && (
            <Badge variant="outline">{data.pagination.total} total</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: pageSize }).map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-4 rounded-lg border p-4"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            Nenhum agendamento encontrado
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {data?.data.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                      <User className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {agendamento.clienteNome || "Cliente não informado"}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {agendamento.servico}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatDate(agendamento.dataHora)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {agendamento.valorCobrado && (
                      <div className="text-muted-foreground flex items-center text-sm">
                        <DollarSign className="mr-1 h-4 w-4" />
                        {formatCurrency(agendamento.valorCobrado)}
                      </div>
                    )}
                    <Badge variant={getStatusColor(agendamento.status)}>
                      {agendamento.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {data && data.pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                  Página {data.pagination.page} de {data.pagination.totalPages}{" "}
                  ({data.pagination.total} total)
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={!data.pagination.hasPreviousPage || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    disabled={!data.pagination.hasNextPage || isLoading}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Indicador de cache */}
        {isStale && (
          <div className="mt-4">
            <Badge variant="outline" className="text-xs">
              📡 Atualizando dados em segundo plano...
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
