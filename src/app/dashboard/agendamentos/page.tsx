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

// Configurações de cache otimizadas
const CACHE_CONFIG = {
  agendamentos: { staleTime: 30 * 1000, cacheTime: 5 * 60 * 1000 },
  clientes: { staleTime: 2 * 60 * 1000, cacheTime: 10 * 60 * 1000 },
  servicos: { staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 },
};

export default function AgendamentosPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [horario, setHorario] = useState<string>("14:00");
  const [servico, setServico] = useState<string>("Corte de cabelo");
  const [isLoading, setIsLoading] = useState(false); // estado de loading

  // Substitua as queries existentes por estas versões otimizadas:
  const { data: cortesDoMes, isLoading: isLoadingCortesDoMes } =
    trpc.agendamento.getCortesDoMes.useQuery(
      {
        month: selectedDate.getMonth() + 1,
        year: selectedDate.getFullYear(),
      },
      CACHE_CONFIG.agendamentos,
    );

  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");

  // Ativar a query automaticamente quando clienteQuery tiver > 1 caractere
  const { data: clientesEncontrados, isFetching } =
    trpc.agendamento.getByClientCode.useQuery(
      { query: clienteQuery },
      {
        enabled: clienteQuery.length > 1,
        keepPreviousData: true,
        ...CACHE_CONFIG.clientes,
      },
    );

  const { data: servicosDisponiveis, isLoading: isLoadingServicos } =
    trpc.configuracao.getServicos.useQuery(undefined, CACHE_CONFIG.servicos);

  const atualizarStatus = trpc.agendamento.atualizarStatus.useMutation({
    onSuccess: () => {
      refetchAgendamentos(); // Atualiza a lista
    },
  });

  const { data: agendamentos, refetch: refetchAgendamentos } =
    trpc.agendamento.getByData.useQuery(
      { date: selectedDate.toISOString() },
      CACHE_CONFIG.agendamentos,
    );

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

  // Função debounce (usando useEffect simples)
  useEffect(() => {
    if (clienteQuery.length <= 1) return;

    const handler = setTimeout(() => {
      // Nada a fazer aqui porque a query está habilitada automaticamente
      // Só atualiza clienteQuery que dispara o fetch
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [clienteQuery]);

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
    <div
      className="animate-fade-in mx-auto flex w-full flex-col gap-6 px-4 md:px-6 lg:px-8"
      style={{
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        {/* Calendário */}
        <Card className="w-full max-w-full">
          <CardHeader>
            <CardTitle>Agendamentos</CardTitle>
            <CardDescription>
              Calendário e cortes do mês selecionado
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-6 md:flex-row">
            {/* Lado esquerdo: Calendário */}
            <div className="w-full md:w-1/2">
              <h3 className="mb-2 text-lg font-semibold">Calendário</h3>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="border-border bg-card w-full rounded-md border p-4 text-[16px] [&_.rdp]:p-4 [&_.rdp]:text-base [&_.rdp-caption_label]:text-xl [&_.rdp-day]:h-10 [&_.rdp-day]:w-10 [&_.rdp-day]:text-base"
              />
            </div>

            {/* Lado direito: Cortes do mês */}
            <div className="w-full md:w-1/2">
              <h3 className="mb-2 text-lg font-semibold">Cortes do mês</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Listagem dos cortes realizados em{" "}
                {format(selectedDate, "MMMM/yyyy", { locale: ptBR })}
              </p>

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

              <div className="space-y-2">
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
                  // Limpa estados ao fechar o modal para esconder dropdown e resetar campos
                  setClienteQuery("");
                  setClienteId(null);
                  setClienteNomeSelecionado("");
                  setHorario("");
                  setServico("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-border hover:text-accent-foreground flex cursor-pointer items-center border transition-colors"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md backdrop-blur-sm">
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                  {/* Seletor de cliente */}
                  <div
                    className={`relative ${
                      clientesEncontrados &&
                      clientesEncontrados.length > 0 &&
                      !clienteId
                        ? "mb-8"
                        : "mb-0"
                    }`}
                  >
                    <label className="text-sm font-medium">
                      Buscar cliente
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
                      placeholder="Nome do cliente"
                      className="border-input bg-background text-foreground mt-1 w-full rounded-md border px-3 py-2"
                      autoComplete="off"
                      readOnly={!!clienteId}
                    />

                    {/* Loading */}
                    {isFetching && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        Buscando...
                      </p>
                    )}

                    {/* Lista de sugestões */}
                    {!isFetching &&
                      clienteQuery.length > 1 &&
                      clientesEncontrados &&
                      clientesEncontrados.length > 0 &&
                      !clienteId && (
                        <div className="border-border bg-popover text-popover-foreground absolute z-50 mt-2 max-h-48 w-full overflow-auto rounded border shadow-sm">
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

                    {/* Cliente não encontrado */}
                    {!isFetching &&
                      clienteQuery.length > 1 &&
                      clientesEncontrados &&
                      clientesEncontrados.length === 0 && (
                        <div className="border-destructive bg-destructive/10 text-destructive mt-2 flex flex-col items-center gap-2 rounded border p-3">
                          <p>Cliente não adicionado.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() =>
                              window.location.assign("/dashboard/clientes")
                            }
                          >
                            Criar novo cliente
                          </Button>
                        </div>
                      )}

                    {/* Nome selecionado */}
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
                      className="border-input bg-background text-foreground mt-1 w-full rounded-md border px-3 py-2"
                    />
                  </div>

                  {/* Serviço */}
                  <div>
                    <label className="text-sm font-medium">Serviço</label>
                    {isLoadingServicos ? (
                      <p>Carregando serviços...</p>
                    ) : (
                      <select
                        value={servico}
                        onChange={(e) => setServico(e.target.value)}
                        className="border-input text-foreground focus:ring-accent mt-1 w-full cursor-pointer rounded-md border bg-black/90 px-3 py-2 shadow-sm backdrop-blur-sm transition duration-200 focus:ring-2 focus:ring-offset-1 focus:outline-none"
                      >
                        <option value="" disabled>
                          Selecione um serviço
                        </option>
                        {servicosDisponiveis?.map((s) => (
                          <option key={s.nome} value={s.nome}>
                            {s.nome} - R$ {s.preco}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="mt-4 flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button className="cursor-pointer" variant="ghost">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button
                      className="cursor-pointer"
                      onClick={async () => {
                        await handleNovoAgendamento();
                        // Após confirmar, limpa estados e fecha modal
                        setClienteQuery("");
                        setClienteId(null);
                        setClienteNomeSelecionado("");
                        setHorario("");
                        setServico("");
                        setOpen(false);
                      }}
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
                className="border-border bg-card text-card-foreground flex flex-col gap-2 rounded border p-2"
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
                  </div>
                  <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs capitalize">
                    {agendamento.status}
                  </span>
                </div>

                {/* Ações: Confirmar ou Cancelar */}
                {agendamento.status === "agendado" && (
                  <div className="flex justify-end gap-2">
                    <Button
                      className="cursor-pointer"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        atualizarStatus.mutate({
                          id: agendamento.id,
                          status: "concluido",
                        })
                      }
                    >
                      Confirmar
                    </Button>
                    <Button
                      className="cursor-pointer"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        atualizarStatus.mutate({
                          id: agendamento.id,
                          status: "cancelado",
                        })
                      }
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
