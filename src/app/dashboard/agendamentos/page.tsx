"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/utils/trpc";
import { Loader2, PlusCircle } from "lucide-react";
import dayjs from "dayjs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export default function AgendamentosPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [horario, setHorario] = useState<string>("14:00");
  const [servico, setServico] = useState<string>("Corte de cabelo");

  const { data: cortesDoMes, isLoading: isLoadingCortesDoMes } =
    trpc.agendamento.getCortesDoMes.useQuery({
      month: selectedDate.getMonth() + 1,
      year: selectedDate.getFullYear(),
    });

  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");

  const {
    data: clientesEncontrados,
    refetch,
    isFetching,
  } = trpc.agendamento.getByClientCode.useQuery(
    { query: clienteQuery },
    { enabled: false },
  );

  // Limpar seleção se query ficar vazia ou cliente não estiver mais na lista
  useEffect(() => {
    if (!clienteQuery && clienteId && clientesEncontrados) {
      if (!clientesEncontrados.some((c) => c.id === clienteId)) {
        setClienteId(null);
        setClienteNomeSelecionado("");
      }
    }
  }, [clienteQuery, clientesEncontrados, clienteId]);

  // Outra verificação para evitar clienteId inválido
  useEffect(() => {
    if (
      clienteId &&
      (!clientesEncontrados ||
        !clientesEncontrados.some((c) => c.id === clienteId))
    ) {
      setClienteId(null);
      setClienteNomeSelecionado("");
    }
  }, [clientesEncontrados, clienteId]);

  const { data: agendamentos, refetch: refetchAgendamentos } =
    trpc.agendamento.getByData.useQuery({
      date: selectedDate.toISOString(),
    });

  const createMutation = trpc.agendamento.create.useMutation({
    onSuccess: () => {
      refetchAgendamentos();
      setOpen(false);
      setHorario("14:00");
      setServico("Corte de cabelo");
      setClienteId(null);
      setClienteNomeSelecionado("");
      setClienteQuery("");
    },
  });

  const handleNovoAgendamento = () => {
    if (createMutation.isLoading) return;
    if (!clienteId) {
      alert("Selecione um cliente válido.");
      return;
    }

    createMutation.mutate({
      clienteId,
      data: format(selectedDate, "yyyy-MM-dd"),
      horario,
      servico,
      status: "agendado",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Calendário */}
        <Card>
          <CardHeader>
            <CardTitle>Calendário de Agendamentos</CardTitle>
            <CardDescription>Gerencie os agendamentos por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Lista de agendamentos e botão novo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                Agendamentos de {format(selectedDate, "dd/MM/yyyy")}
              </CardTitle>
              <CardDescription>
                Total: {agendamentos?.length ?? 0}
              </CardDescription>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                  {/* Seletor de cliente */}
                  <div>
                    <label className="text-sm font-medium">
                      Buscar cliente
                    </label>
                    <input
                      type="text"
                      value={clienteQuery}
                      onChange={(e) => {
                        setClienteQuery(e.target.value);
                        setClienteId(null);
                        setClienteNomeSelecionado("");
                        refetch();
                      }}
                      placeholder="Nome ou ID do cliente"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                    />

                    {isFetching && (
                      <p className="text-muted-foreground text-sm">
                        Buscando...
                      </p>
                    )}
                    {!isFetching && clientesEncontrados?.length! > 0 && (
                      <div className="mt-2 max-h-48 overflow-auto rounded border">
                        {clientesEncontrados!.map((cliente) => (
                          <div
                            key={cliente.id}
                            className="hover:bg-muted cursor-pointer px-3 py-2"
                            onClick={() => {
                              setClienteId(cliente.id);
                              setClienteNomeSelecionado(cliente.nome);
                              setClienteQuery("");
                            }}
                          >
                            {cliente.nome}
                          </div>
                        ))}
                      </div>
                    )}

                    {clienteNomeSelecionado && (
                      <p className="mt-1 text-sm text-green-600">
                        Cliente selecionado: {clienteNomeSelecionado}
                      </p>
                    )}
                  </div>

                  {/* Horário */}
                  <div>
                    <label className="text-sm font-medium">Horário</label>
                    <input
                      type="time"
                      value={horario}
                      onChange={(e) => setHorario(e.target.value)}
                      className="mt-1 w-full rounded-md border px-3 py-2"
                    />
                  </div>

                  {/* Serviço */}
                  <div>
                    <label className="text-sm font-medium">Serviço</label>
                    <input
                      type="text"
                      value={servico}
                      onChange={(e) => setServico(e.target.value)}
                      placeholder="Ex: Corte de cabelo"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                    />
                  </div>

                  {/* Botões */}
                  <div className="mt-4 flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="ghost">Cancelar</Button>
                    </DialogClose>
                    <Button
                      onClick={handleNovoAgendamento}
                      disabled={createMutation.isLoading}
                    >
                      {createMutation.isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Confirmar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="space-y-2">
            {agendamentos?.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhum agendamento para esta data.
              </p>
            )}
            {agendamentos?.map((agendamento) => (
              <div
                key={agendamento.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div>
                  <p className="font-medium">
                    {agendamento.cliente?.nome ?? "Cliente desconhecido"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {dayjs(agendamento.dataHora).format("HH:mm")} -{" "}
                    {agendamento.servico}
                  </p>
                </div>
                <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs capitalize">
                  {agendamento.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cortes do mês</CardTitle>
            <CardDescription>
              Listagem dos cortes realizados em{" "}
              {format(selectedDate, "MMMM/yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            {isLoadingCortesDoMes && (
              <p className="text-muted-foreground text-sm">
                Carregando cortes...
              </p>
            )}
            {cortesDoMes?.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhum corte registrado neste mês.
              </p>
            )}
            {cortesDoMes?.map((corte) => (
              <div
                key={corte.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div>
                  <p className="font-medium">
                    {corte.cliente?.nome ?? "Cliente desconhecido"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {dayjs(corte.dataHora).format("DD/MM HH:mm")} -{" "}
                    {corte.servico}
                  </p>
                </div>
                <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs capitalize">
                  {corte.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
