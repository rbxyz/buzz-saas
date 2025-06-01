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
import {
  Loader2,
  PlusCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import dayjs from "dayjs";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

// Função para aplicar máscara de horário
const aplicarMascaraHorario = (valor: string): string => {
  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, "");

  // Aplica a máscara HH:MM
  if (numeros.length <= 2) {
    return numeros;
  } else if (numeros.length <= 4) {
    return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
  } else {
    return `${numeros.slice(0, 2)}:${numeros.slice(2, 4)}`;
  }
};

// Função para validar horário
const validarHorario = (horario: string): boolean => {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!regex.test(horario)) return false;

  const [horas, minutos] = horario.split(":").map(Number);
  return horas! >= 0 && horas! <= 23 && minutos! >= 0 && minutos! <= 59;
};

export default function AgendamentosPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [horario, setHorario] = useState<string>("");
  const [horarioInput, setHorarioInput] = useState<string>("");
  const [servico, setServico] = useState<string>("");
  const [dataParaAgendamento, setDataParaAgendamento] = useState<Date>(
    new Date(),
  );

  // Apenas consome dados já em cache (sem loading states)
  const { data: cortesDoMes } = trpc.agendamento.getCortesDoMes.useQuery({
    month: selectedDate.getMonth() + 1,
    year: selectedDate.getFullYear(),
  });

  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");

  const { data: clientesEncontrados, isFetching } =
    trpc.agendamento.getByClientCode.useQuery(
      { query: clienteQuery },
      {
        enabled: clienteQuery.length > 1,
        staleTime: 1000 * 60 * 5, // 5 minutos
      },
    );

  const { data: servicosDisponiveis } =
    trpc.configuracao.getServicos.useQuery();

  // Buscar horários disponíveis quando data e serviço estiverem selecionados
  const { data: horariosData, isLoading: loadingHorarios } =
    trpc.agendamento.getHorariosDisponiveisPorData.useQuery(
      {
        data: format(dataParaAgendamento, "yyyy-MM-dd"),
        servico: servico,
      },
      {
        enabled: !!servico && !!dataParaAgendamento,
        refetchOnWindowFocus: false,
      },
    );

  // Verificar conflito quando horário específico for selecionado
  const { data: conflito } = trpc.agendamento.verificarConflito.useQuery(
    {
      data: format(dataParaAgendamento, "yyyy-MM-dd"),
      horario: horario,
      servico: servico,
    },
    {
      enabled:
        !!horario &&
        !!servico &&
        !!dataParaAgendamento &&
        validarHorario(horario),
      refetchOnWindowFocus: false,
    },
  );

  const atualizarStatus = trpc.agendamento.atualizarStatus.useMutation({
    onSuccess: () => {
      void refetchAgendamentos();
    },
  });

  const createMutation = trpc.agendamento.create.useMutation({
    onSuccess: () => {
      void refetchAgendamentos();
      setOpen(false);
      setHorario("");
      setHorarioInput("");
      setServico("");
      setClienteId(null);
      setClienteNomeSelecionado("");
      setClienteQuery("");
      setDataParaAgendamento(new Date());
    },
  });

  // Função debounce
  useEffect(() => {
    if (clienteQuery.length <= 1) return;

    const handler = setTimeout(() => {
      // Query automática via enabled
    }, 300);

    return () => clearTimeout(handler);
  }, [clienteQuery]);

  // Limpar seleção se necessário
  useEffect(() => {
    if (!clienteQuery && clienteId && clientesEncontrados) {
      if (!clientesEncontrados.some((c) => c.id === clienteId)) {
        setClienteId(null);
        setClienteNomeSelecionado("");
      }
    }
  }, [clienteQuery, clientesEncontrados, clienteId]);

  useEffect(() => {
    if (clienteId && !clientesEncontrados?.some((c) => c.id === clienteId)) {
      setClienteId(null);
      setClienteNomeSelecionado("");
    }
  }, [clientesEncontrados, clienteId]);

  // Função para navegar entre datas
  const navegarData = (direcao: "anterior" | "proxima") => {
    const novaData = new Date(dataParaAgendamento);
    if (direcao === "anterior") {
      novaData.setDate(novaData.getDate() - 1);
    } else {
      novaData.setDate(novaData.getDate() + 1);
    }
    setDataParaAgendamento(novaData);
    // Limpar horário quando mudar data
    setHorario("");
    setHorarioInput("");
  };

  // Função para lidar com mudança no input de horário
  const handleHorarioChange = (valor: string) => {
    const valorComMascara = aplicarMascaraHorario(valor);
    setHorarioInput(valorComMascara);

    // Se o horário estiver completo e válido, atualizar o estado do horário
    if (valorComMascara.length === 5 && validarHorario(valorComMascara)) {
      setHorario(valorComMascara);
    } else {
      setHorario("");
    }
  };

  const handleNovoAgendamento = () => {
    if (createMutation.isPending) return;
    if (!clienteId) {
      alert("Selecione um cliente válido.");
      return;
    }
    if (!horario || !validarHorario(horario)) {
      alert("Digite um horário válido (HH:MM).");
      return;
    }
    if (!servico) {
      alert("Selecione um serviço.");
      return;
    }
    if (conflito?.temConflito) {
      alert("Este horário está ocupado. Selecione outro horário.");
      return;
    }

    createMutation.mutate({
      clienteId,
      data: format(dataParaAgendamento, "yyyy-MM-dd"),
      horario,
      servico,
      status: "agendado",
    });
  };

  // Verificar se a data é hoje para não permitir voltar para datas passadas
  const podeVoltarData = dayjs(dataParaAgendamento).isAfter(dayjs(), "day");

  const { data: agendamentos, refetch: refetchAgendamentos } =
    trpc.agendamento.getHorariosDisponiveisPorData.useQuery({
      data: format(selectedDate, "yyyy-MM-dd"),
      servico: servico ?? "",
    });

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
                Total: {Array.isArray(agendamentos) ? agendamentos.length : 0}
              </CardDescription>
            </div>

            <Dialog
              open={open}
              onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) {
                  setClienteQuery("");
                  setClienteId(null);
                  setClienteNomeSelecionado("");
                  setHorario("");
                  setHorarioInput("");
                  setServico("");
                  setDataParaAgendamento(new Date());
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

              <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto backdrop-blur-sm">
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

                    {clienteNomeSelecionado && (
                      <p className="mt-1 text-sm text-green-600">
                        Cliente selecionado: {clienteNomeSelecionado}
                      </p>
                    )}
                  </div>

                  {/* Navegação de data */}
                  <div>
                    <label className="text-sm font-medium">
                      Data do agendamento
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navegarData("anterior")}
                        disabled={!podeVoltarData}
                        className="cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="bg-background border-input flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2">
                        <Calendar className="text-muted-foreground h-4 w-4" />
                        <span className="font-medium">
                          {format(
                            dataParaAgendamento,
                            "EEEE, dd 'de' MMMM 'de' yyyy",
                            { locale: ptBR },
                          )}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navegarData("proxima")}
                        className="cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Serviço */}
                  <div>
                    <label className="text-sm font-medium">Serviço</label>
                    <select
                      value={servico}
                      onChange={(e) => {
                        setServico(e.target.value);
                        setHorario(""); // Limpar horário quando mudar serviço
                        setHorarioInput("");
                      }}
                      className="border-input text-foreground focus:ring-accent bg-background mt-1 w-full cursor-pointer rounded-md border px-3 py-2 shadow-sm transition duration-200 focus:ring-2 focus:ring-offset-1 focus:outline-none"
                    >
                      <option value="">Selecione um serviço</option>
                      {Array.isArray(servicosDisponiveis) &&
                        servicosDisponiveis.map(
                          (s: {
                            nome: string;
                            preco: number;
                            duracaoMinutos?: number;
                          }) => (
                            <option key={s.nome} value={s.nome}>
                              {s.nome} - R$ {s.preco} ({s.duracaoMinutos ?? 30}
                              min)
                            </option>
                          ),
                        )}
                    </select>
                  </div>

                  {/* Intervalos de funcionamento */}
                  {horariosData?.intervalos &&
                    horariosData.intervalos.length > 0 && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            Funcionamento em{" "}
                            {format(dataParaAgendamento, "EEEE", {
                              locale: ptBR,
                            })}
                            :
                          </span>
                        </div>
                        <div className="text-sm text-blue-700">
                          {horariosData.intervalos.map((intervalo, index) => (
                            <span key={index}>
                              {intervalo.inicio} às {intervalo.fim}
                              {index < horariosData.intervalos.length - 1 &&
                                " • "}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Campo manual de horário */}
                  <div>
                    <label className="text-sm font-medium">
                      Horário desejado
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        value={horarioInput}
                        onChange={(e) => handleHorarioChange(e.target.value)}
                        placeholder="HH:MM"
                        maxLength={5}
                        className="border-input bg-background text-foreground w-full rounded-md border px-3 py-2 font-mono text-lg tracking-wider"
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <Clock className="text-muted-foreground h-4 w-4" />
                      </div>
                    </div>

                    {/* Validação do horário */}
                    {horarioInput &&
                      horarioInput.length === 5 &&
                      !validarHorario(horarioInput) && (
                        <p className="mt-1 text-sm text-red-600">
                          Horário inválido. Use o formato HH:MM (ex: 14:30)
                        </p>
                      )}
                  </div>

                  {/* Horários sugeridos */}
                  {servico && dataParaAgendamento && (
                    <div>
                      <label className="text-sm font-medium">
                        Horários sugeridos
                      </label>

                      {loadingHorarios && (
                        <div className="mt-2 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground text-sm">
                            Carregando horários...
                          </span>
                        </div>
                      )}

                      {horariosData?.erro && (
                        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
                          <p className="text-sm text-red-700">
                            {horariosData.erro}
                          </p>
                        </div>
                      )}

                      {horariosData?.horarios &&
                        horariosData.horarios.length > 0 && (
                          <div className="mt-2 grid max-h-32 grid-cols-4 gap-2 overflow-y-auto">
                            {horariosData.horarios
                              .filter((item) => item.disponivel)
                              .slice(0, 12) // Mostrar apenas os primeiros 12 horários disponíveis
                              .map((item) => (
                                <Button
                                  key={item.horario}
                                  variant={
                                    horario === item.horario
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="cursor-pointer text-xs"
                                  onClick={() => {
                                    setHorario(item.horario);
                                    setHorarioInput(item.horario);
                                  }}
                                >
                                  {item.horario}
                                </Button>
                              ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Aviso de conflito e sugestão */}
                  {conflito?.temConflito &&
                    horario &&
                    validarHorario(horario) && (
                      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-600" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">
                              Este horário já está ocupado!
                            </p>
                            {conflito.proximoDisponivel && (
                              <p className="mt-1 text-sm text-yellow-700">
                                Horário mais próximo disponível:{" "}
                                {conflito.proximoDisponivel}
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="ml-2 h-auto cursor-pointer p-0 text-yellow-700 underline"
                                  onClick={() => {
                                    setHorario(conflito.proximoDisponivel!);
                                    setHorarioInput(
                                      conflito.proximoDisponivel!,
                                    );
                                  }}
                                >
                                  Selecionar
                                </Button>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Confirmação de horário válido */}
                  {horario &&
                    validarHorario(horario) &&
                    !conflito?.temConflito && (
                      <div className="rounded-md border border-green-200 bg-green-50 p-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <p className="text-sm font-medium text-green-800">
                            Horário {horario} disponível para agendamento!
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Botões */}
                  <div className="mt-4 flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button className="cursor-pointer" variant="ghost">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button
                      className="cursor-pointer"
                      onClick={handleNovoAgendamento}
                      disabled={
                        Boolean(createMutation.isPending) ||
                        !clienteId ||
                        !horario ||
                        !validarHorario(horario) ||
                        !servico ||
                        conflito?.temConflito
                      }
                    >
                      {Boolean(createMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Confirmar Agendamento
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="space-y-2">
            {Array.isArray(agendamentos) && agendamentos.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhum agendamento para esta data.
              </p>
            )}
            {Array.isArray(agendamentos) &&
              agendamentos.map(
                (agendamento: {
                  id: string;
                  cliente?: { nome?: string };
                  dataHora: string;
                  servico: string;
                  duracaoMinutos?: number;
                  status: string;
                }) => (
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
                          {agendamento.servico} (
                          {agendamento.duracaoMinutos ?? 30}min)
                        </p>
                      </div>
                      <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs capitalize">
                        {agendamento.status}
                      </span>
                    </div>

                    {agendamento.status === "agendado" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          className="cursor-pointer"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void atualizarStatus.mutate({
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
                            void atualizarStatus.mutate({
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
                ),
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
