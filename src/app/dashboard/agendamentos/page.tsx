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
import { api } from "@/trpc/react";
import { Loader2, PlusCircle, Clock, AlertCircle } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AgendamentosPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [horario, setHorario] = useState<string>("");
  const [servico, setServico] = useState<string>("");

  // Estados para busca de cliente
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");

  // Queries
  const { data: cortesDoMes } = api.agendamento.getCortesDoMes.useQuery({
    month: selectedDate.getMonth() + 1,
    year: selectedDate.getFullYear(),
  });

  const { data: clientesEncontrados, isFetching } =
    api.agendamento.getByClientCode.useQuery(
      { query: clienteQuery },
      {
        enabled: clienteQuery.length > 1,
        keepPreviousData: true,
      },
    );

  const { data: servicosDisponiveis } = api.agendamento.getServicos.useQuery();

  // Nova query para horários disponíveis
  const { data: horariosData, isLoading: loadingHorarios } =
    api.agendamento.getHorariosDisponiveis.useQuery(
      {
        data: dayjs(selectedDate).format("YYYY-MM-DD"),
        servico: servico || "",
      },
      {
        enabled: !!servico,
      },
    );

  const { data: agendamentos, refetch: refetchAgendamentos } =
    api.agendamento.getByData.useQuery({
      date: selectedDate.toISOString(),
    });

  // Mutations
  const atualizarStatus = api.agendamento.atualizarStatus.useMutation({
    onSuccess: () => {
      refetchAgendamentos();
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createMutation = api.agendamento.create.useMutation({
    onSuccess: () => {
      refetchAgendamentos();
      setOpen(false);
      resetForm();
      toast.success("Agendamento criado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setHorario("");
    setServico("");
    setClienteId(null);
    setClienteNomeSelecionado("");
    setClienteQuery("");
  };

  // Função debounce para busca de clientes
  useEffect(() => {
    if (clienteQuery.length <= 1) return;

    const handler = setTimeout(() => {
      // Query automática via enabled
    }, 300);

    return () => clearTimeout(handler);
  }, [clienteQuery]);

  // Reset horário quando serviço muda
  useEffect(() => {
    setHorario("");
  }, [servico]);

  const handleNovoAgendamento = () => {
    if (createMutation.isPending) return;

    if (!clienteId) {
      toast.error("Selecione um cliente válido.");
      return;
    }

    if (!servico) {
      toast.error("Selecione um serviço.");
      return;
    }

    if (!horario) {
      toast.error("Selecione um horário.");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado":
        return "bg-blue-100 text-blue-800";
      case "concluido":
        return "bg-green-100 text-green-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="animate-fade-in mx-auto flex w-full flex-col gap-6 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        {/* Calendário */}
        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle>Calendário</CardTitle>
            <CardDescription>
              Navegue entre as datas para ver os agendamentos
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-6 md:flex-row">
            {/* Lado esquerdo: Calendário */}
            <div className="w-full md:w-1/2">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="border-border bg-card w-full rounded-md border p-4 text-[16px]"
                modifiers={{
                  hasAppointments:
                    cortesDoMes?.map((corte) => new Date(corte.dataHora)) || [],
                }}
                modifiersStyles={{
                  hasAppointments: {
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    fontWeight: "bold",
                  },
                }}
              />
            </div>

            {/* Lado direito: Cortes do mês */}
            <div className="w-full md:w-1/2">
              <h3 className="mb-2 text-lg font-semibold">Cortes do mês</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Listagem dos cortes realizados em{" "}
                {format(selectedDate, "MMMM/yyyy", { locale: ptBR })}
              </p>

              {cortesDoMes?.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Nenhum corte registrado neste mês.
                </p>
              )}

              <div className="max-h-64 space-y-2 overflow-y-auto">
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
                    <span
                      className={`rounded px-2 py-1 text-xs capitalize ${getStatusColor(corte.status)}`}
                    >
                      {corte.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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

            <Dialog
              open={open}
              onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) {
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex cursor-pointer items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                  {/* Seletor de cliente */}
                  <div className="relative">
                    <label className="text-sm font-medium">
                      Buscar cliente *
                    </label>
                    <input
                      type="text"
                      value={clienteQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setClienteQuery(value);
                        setClienteId(null);
                        setClienteNomeSelecionado("");
                      }}
                      placeholder="Digite o nome do cliente..."
                      className="border-input bg-background text-foreground mt-1 w-full rounded-md border px-3 py-2"
                      autoComplete="off"
                      readOnly={!!clienteId}
                    />

                    {isFetching && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        Buscando...
                      </p>
                    )}

                    {!isFetching &&
                      clienteQuery.length > 1 &&
                      clientesEncontrados &&
                      clientesEncontrados.length > 0 &&
                      !clienteId && (
                        <div className="border-border bg-popover absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded border shadow-md">
                          {clientesEncontrados.map((cliente) => (
                            <div
                              key={cliente.id}
                              className="hover:bg-muted cursor-pointer px-3 py-2 text-sm"
                              onClick={() => {
                                setClienteId(cliente.id);
                                setClienteNomeSelecionado(cliente.nome);
                                setClienteQuery(cliente.nome);
                              }}
                            >
                              {cliente.nome}
                            </div>
                          ))}
                        </div>
                      )}

                    {!isFetching &&
                      clienteQuery.length > 1 &&
                      clientesEncontrados &&
                      clientesEncontrados.length === 0 && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Cliente não encontrado.{" "}
                            <Button
                              variant="link"
                              className="text-primary h-auto p-0 underline"
                              onClick={() =>
                                window.open("/dashboard/clientes", "_blank")
                              }
                            >
                              Criar novo cliente
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                    {clienteNomeSelecionado && (
                      <p className="mt-1 text-sm text-green-600">
                        ✓ Cliente selecionado: {clienteNomeSelecionado}
                      </p>
                    )}
                  </div>

                  {/* Serviço */}
                  <div>
                    <label className="text-sm font-medium">Serviço *</label>
                    <Select value={servico} onValueChange={setServico}>
                      <SelectTrigger className="mt-1 cursor-pointer">
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent className="cursor-pointer bg-black/50 backdrop-blur-sm">
                        {servicosDisponiveis?.map((s) => (
                          <SelectItem
                            className="cursor-pointer"
                            key={s.nome}
                            value={s.nome}
                          >
                            {s.nome} - R$ {s.preco.toFixed(2)} (
                            {s.duracaoMinutos}min)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Horário */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Horário *
                    </label>

                    {!servico ? (
                      <div className="mt-1 rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                        Selecione um serviço primeiro
                      </div>
                    ) : loadingHorarios ? (
                      <div className="mt-1 flex items-center justify-center rounded-md border border-dashed border-gray-300 p-4">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-500">
                          Carregando horários...
                        </span>
                      </div>
                    ) : horariosData?.erro ? (
                      <Alert className="mt-1" variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{horariosData.erro}</AlertDescription>
                      </Alert>
                    ) : horariosData?.horarios.length === 0 ? (
                      <Alert className="mt-1">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Nenhum horário disponível para esta data. Todos os
                          horários estão ocupados ou fora do horário de
                          funcionamento.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Select value={horario} onValueChange={setHorario}>
                        <SelectTrigger className="mt-1 cursor-pointer">
                          <SelectValue placeholder="Selecione um horário" />
                        </SelectTrigger>
                        <SelectContent className="cursor-pointer bg-black/50 backdrop-blur-sm">
                          {horariosData?.horarios.map((h) => (
                            <SelectItem
                              className="cursor-pointer"
                              key={h}
                              value={h}
                            >
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Resumo do agendamento */}
                  {clienteId && servico && horario && (
                    <div className="bg-muted/50 rounded-lg border p-3">
                      <h4 className="mb-2 text-sm font-medium">
                        Resumo do Agendamento
                      </h4>
                      <div className="text-muted-foreground space-y-1 text-xs">
                        <p>
                          <strong>Cliente:</strong> {clienteNomeSelecionado}
                        </p>
                        <p>
                          <strong>Serviço:</strong> {servico}
                        </p>
                        <p>
                          <strong>Data:</strong>{" "}
                          {format(selectedDate, "dd/MM/yyyy")}
                        </p>
                        <p>
                          <strong>Horário:</strong> {horario}
                        </p>
                        {servicosDisponiveis && (
                          <p>
                            <strong>Valor:</strong> R${" "}
                            {servicosDisponiveis
                              .find((s) => s.nome === servico)
                              ?.preco.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botões */}
                  <div className="flex justify-end gap-2 pt-4">
                    <DialogClose asChild>
                      <Button variant="ghost">Cancelar</Button>
                    </DialogClose>
                    <Button
                      onClick={handleNovoAgendamento}
                      disabled={
                        !clienteId ||
                        !servico ||
                        !horario ||
                        createMutation.isPending
                      }
                    >
                      {createMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Criar Agendamento
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="space-y-3">
            {agendamentos?.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhum agendamento para esta data.
              </p>
            )}
            {agendamentos?.map((agendamento) => (
              <div
                key={agendamento.id}
                className="border-border bg-card flex flex-col gap-3 rounded border p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {agendamento.cliente?.nome ?? "Cliente desconhecido"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {dayjs(agendamento.dataHora).format("HH:mm")} -{" "}
                      {agendamento.servico}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Duração: {agendamento.duracaoMinutos} minutos
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs capitalize ${getStatusColor(agendamento.status)}`}
                  >
                    {agendamento.status}
                  </span>
                </div>

                {agendamento.status === "agendado" && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        atualizarStatus.mutate({
                          id: agendamento.id,
                          status: "concluido",
                        })
                      }
                      disabled={atualizarStatus.isPending}
                    >
                      Confirmar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        atualizarStatus.mutate({
                          id: agendamento.id,
                          status: "cancelado",
                        })
                      }
                      disabled={atualizarStatus.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
