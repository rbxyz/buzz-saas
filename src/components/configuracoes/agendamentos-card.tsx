"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, Check, X, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";

export function AgendamentosCard() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { toast } = useToast();

  // Buscar agendamentos do dia selecionado
  const { data: agendamentos, refetch: refetchAgendamentos, isLoading } = 
    api.agendamento.getByData.useQuery({
      date: selectedDate,
    });

  // Mutation para atualizar status
  const atualizarStatus = api.agendamento.updateStatus.useMutation({
    onSuccess: () => {
      void refetchAgendamentos();
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleConcluirAgendamento = (agendamentoId: number) => {
    atualizarStatus.mutate({ 
      id: agendamentoId, 
      status: 'concluido' 
    });
  };

  const handleCancelarAgendamento = (agendamentoId: number) => {
    atualizarStatus.mutate({ 
      id: agendamentoId, 
      status: 'cancelado' 
    });
  };

  const agendamentosAgendados = agendamentos?.filter(a => a.status === "agendado") ?? [];
  const agendamentosConcluidos = agendamentos?.filter(a => a.status === "concluido") ?? [];
  const agendamentosCancelados = agendamentos?.filter(a => a.status === "cancelado") ?? [];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <CardTitle>Gerenciar Agendamentos</CardTitle>
        </div>
        <CardDescription>
          Visualize e gerencie os agendamentos do dia selecionado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Seletor de Data */}
        <div className="flex items-center gap-4">
          <label htmlFor="date-selector" className="text-sm font-medium">
            Data:
          </label>
          <input
            id="date-selector"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando agendamentos...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agendamentos Agendados */}
            {agendamentosAgendados.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Agendados ({agendamentosAgendados.length})
                </h3>
                <div className="space-y-3">
                  {agendamentosAgendados.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {agendamento.cliente?.nome ?? "Cliente não encontrado"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {dayjs(agendamento.dataHora).format("HH:mm")}
                          </span>
                        </div>
                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                          {agendamento.servico}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConcluirAgendamento(agendamento.id)}
                          disabled={atualizarStatus.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelarAgendamento(agendamento.id)}
                          disabled={atualizarStatus.isPending}
                          className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agendamentos Concluídos */}
            {agendamentosConcluidos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  Concluídos ({agendamentosConcluidos.length})
                </h3>
                <div className="space-y-3">
                  {agendamentosConcluidos.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {agendamento.cliente?.nome ?? "Cliente não encontrado"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {dayjs(agendamento.dataHora).format("HH:mm")}
                          </span>
                        </div>
                        <Badge variant="outline" className="border-green-200 text-green-700">
                          {agendamento.servico}
                        </Badge>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                        Concluído
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agendamentos Cancelados */}
            {agendamentosCancelados.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                  <X className="h-5 w-5" />
                  Cancelados ({agendamentosCancelados.length})
                </h3>
                <div className="space-y-3">
                  {agendamentosCancelados.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-red-50/50 dark:bg-red-950/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {agendamento.cliente?.nome ?? "Cliente não encontrado"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {dayjs(agendamento.dataHora).format("HH:mm")}
                          </span>
                        </div>
                        <Badge variant="outline" className="border-red-200 text-red-700">
                          {agendamento.servico}
                        </Badge>
                      </div>
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                        Cancelado
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem quando não há agendamentos */}
            {agendamentos?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento encontrado para esta data.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 