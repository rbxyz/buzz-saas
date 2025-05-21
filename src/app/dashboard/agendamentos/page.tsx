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

  // Estado do input de busca e seleção de cliente
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNomeSelecionado, setClienteNomeSelecionado] =
    useState<string>("");

  // Busca clientes com debounce simples para autocomplete
  const {
    data: clientesEncontrados,
    refetch,
    isFetching,
  } = trpc.agendamento.getByClientCode.useQuery(
    { query: clienteQuery },
    {
      enabled: false,
    },
  );

  // Atualiza a busca quando o usuário digita (debounce manual simples)
  useEffect(() => {
    if (clienteQuery.trim().length === 0) return;

    const handle = setTimeout(() => {
      refetch();
    }, 300);

    return () => clearTimeout(handle);
  }, [clienteQuery, refetch]);

  // Reset cliente selecionado se query mudar e não bater com clienteId atual
  useEffect(() => {
    if (
      clienteId &&
      (!clientesEncontrados ||
        !clientesEncontrados.some((c) => c.id === clienteId))
    ) {
      setClienteId(null);
      setClienteNomeSelecionado("");
    }
  }, [clienteQuery, clientesEncontrados, clienteId]);

  // Query para carregar agendamentos do dia selecionado
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
    if (createMutation.status === "pending") return;
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

        {/* Lista de agendamentos do dia */}
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

            {/* Botão que abre o modal */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>

                {/* Formulário */}
                <div className="mt-2 flex flex-col gap-4">
                  <label className="flex flex-col">
                    Data
                    <input
                      type="text"
                      value={format(selectedDate, "dd/MM/yyyy")}
                      disabled
                      className="cursor-not-allowed rounded border bg-gray-100 px-2 py-1"
                    />
                  </label>

                  <label className="flex flex-col">
                    Horário
                    <input
                      type="time"
                      value={horario}
                      onChange={(e) => setHorario(e.target.value)}
                      className="rounded border px-2 py-1"
                    />
                  </label>

                  <label className="flex flex-col">
                    Serviço
                    <input
                      type="text"
                      value={servico}
                      onChange={(e) => setServico(e.target.value)}
                      className="rounded border px-2 py-1"
                    />
                  </label>

                  {/* Campo de busca e seleção de cliente */}
                  <label className="relative flex flex-col">
                    Cliente
                    <input
                      type="text"
                      value={clienteNomeSelecionado || clienteQuery}
                      onChange={(e) => {
                        setClienteQuery(e.target.value);
                        setClienteNomeSelecionado("");
                        setClienteId(null);
                      }}
                      placeholder="Digite nome ou ID do cliente"
                      className="rounded border px-2 py-1"
                      autoComplete="off"
                    />
                    {/* Dropdown autocomplete */}
                    {clienteQuery.length > 0 && (
                      <ul className="absolute z-50 max-h-48 w-full overflow-auto rounded border bg-white shadow-md">
                        {isFetching && (
                          <li className="p-2 text-center text-sm text-gray-500">
                            Carregando...
                          </li>
                        )}

                        {!isFetching && clientesEncontrados?.length === 0 && (
                          <li className="p-2 text-center text-sm text-gray-500">
                            Nenhum cliente encontrado.
                          </li>
                        )}

                        {!isFetching &&
                          clientesEncontrados?.map((cliente) => (
                            <li
                              key={cliente.id}
                              className="cursor-pointer border-b px-2 py-1 hover:bg-gray-100"
                              onClick={() => {
                                setClienteId(cliente.id);
                                setClienteNomeSelecionado(cliente.nome);
                                setClienteQuery("");
                              }}
                            >
                              {cliente.nome} ({cliente.id.slice(0, 8)}...)
                            </li>
                          ))}
                      </ul>
                    )}
                  </label>

                  <div className="flex justify-end space-x-2">
                    <DialogClose asChild>
                      <Button
                        variant="outline"
                        disabled={createMutation.status === "pending"}
                      >
                        Cancelar
                      </Button>
                    </DialogClose>

                    <Button
                      onClick={handleNovoAgendamento}
                      disabled={createMutation.status === "pending"}
                    >
                      {createMutation.status === "pending" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="space-y-3">
            {agendamentos && agendamentos.length > 0 ? (
              agendamentos.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="rounded-lg border p-3 shadow-sm"
                >
                  <p className="font-semibold">
                    {dayjs(agendamento.dataHora).format("HH:mm")} —{" "}
                    {agendamento.servico}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Cliente: {agendamento.cliente?.nome ?? "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status: {agendamento.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhum agendamento para este dia.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
