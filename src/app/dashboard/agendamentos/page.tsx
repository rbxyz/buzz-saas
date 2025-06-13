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
import {
  Loader2,
  PlusCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  XIcon,
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Função para aplicar máscara de horário com correção automática
const aplicarMascaraHorario = (valor: string): string => {
  // Remove tudo que não é número
  const numeros = valor.replace(/\D/g, "");

  // Se não há números, retorna vazio
  if (numeros.length === 0) return "";

  // Se tem apenas 1 dígito
  if (numeros.length === 1) {
    return numeros;
  }

  // Se tem 2 dígitos
  if (numeros.length === 2) {
    const primeiroDigito = Number.parseInt(numeros[0]!);
    const segundoDigito = Number.parseInt(numeros[1]!);

    // Se o primeiro dígito é > 2, assume que é minuto e adiciona 0 na frente
    // Ex: "9" + "1" = "91" vira "09:1"
    if (primeiroDigito > 2) {
      return `0${primeiroDigito}:${segundoDigito}`;
    }

    // Se o primeiro dígito é 2 e o segundo > 3, assume que é minuto
    // Ex: "2" + "5" = "25" vira "02:5"
    if (primeiroDigito === 2 && segundoDigito > 3) {
      return `0${primeiroDigito}:${segundoDigito}`;
    }

    // Caso contrário, mantém como hora
    return numeros;
  }

  // Se tem 3 dígitos
  if (numeros.length === 3) {
    const primeiroDigito = Number.parseInt(numeros[0]!);
    const segundoDigito = Number.parseInt(numeros[1]!);
    const terceiroDigito = Number.parseInt(numeros[2]!);

    // Se os dois primeiros dígitos formam uma hora inválida (> 23)
    const horaFormada = Number.parseInt(numeros.slice(0, 2));
    if (horaFormada > 23) {
      // Reorganiza: primeiro dígito vira hora com zero, segundo e terceiro viram minuto
      return `0${primeiroDigito}:${segundoDigito}${terceiroDigito}`;
    }

    // Caso contrário, aplica máscara normal
    return `${numeros.slice(0, 2)}:${terceiroDigito}`;
  }

  // Se tem 4 ou mais dígitos
  if (numeros.length >= 4) {
    const hora = numeros.slice(0, 2);
    const minuto = numeros.slice(2, 4);

    // Verifica se a hora é válida
    const horaNum = Number.parseInt(hora);
    if (horaNum > 23) {
      // Se hora inválida, reorganiza pegando primeiro dígito como hora
      const primeiroDigito = numeros[0]!;
      const restante = numeros.slice(1, 3);
      return `0${primeiroDigito}:${restante}`;
    }

    return `${hora}:${minuto}`;
  }

  return numeros;
};

// Função para validar horário
const validarHorario = (horario: string): boolean => {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!regex.test(horario)) return false;

  const [horas, minutos] = horario.split(":").map(Number);
  return horas! >= 0 && horas! <= 23 && minutos! >= 0 && minutos! <= 59;
};

export default function AgendamentosPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [horario, setHorario] = useState<string>("");
  const [horarioInput, setHorarioInput] = useState<string>("");
  const [servico, setServico] = useState<string>("");
  const [dataParaAgendamento, setDataParaAgendamento] = useState<Date>(
    new Date(),
  );
  const [activeTab, setActiveTab] = useState<string>("calendario");
  const isMobile = useIsMobile();

  // Estados para busca de cliente
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);

  // Queries
  const { data: cortesDoMes } = api.agendamento.getCortesDoMes.useQuery({
    month: selectedDate.getMonth() + 1,
    year: selectedDate.getFullYear(),
  });
  console.log("selectedDate:", selectedDate);
  console.log("selectedDate.getFullYear():", selectedDate.getFullYear());

  const { data: clientesEncontrados, isFetching } =
    api.agendamento.getByClientCode.useQuery(
      { query: clienteQuery },
      {
        enabled: clienteQuery.length > 1,
        placeholderData: (previousData) => previousData,
      },
    );

  const { data: servicosDisponiveis } = api.agendamento.getServicos.useQuery();

  // Buscar horários disponíveis quando data e serviço estiverem selecionados
  const { data: horariosData, isLoading: loadingHorarios } =
    api.agendamento.getHorariosDisponiveisPorData.useQuery(
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
  const { data: conflito } = api.agendamento.verificarConflito.useQuery(
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

  const { data: agendamentos, refetch: refetchAgendamentos } =
    api.agendamento.getByData.useQuery({
      date: selectedDate.toISOString(),
    });

  // Mutations
  const atualizarStatus = api.agendamento.atualizarStatus.useMutation({
    onSuccess: () => {
      void refetchAgendamentos();
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createMutation = api.agendamento.create.useMutation({
    onSuccess: () => {
      void refetchAgendamentos();
      setOpen(false);
      resetForm();
      toast.success("🎉 Agendamento criado!", {
        description: "O agendamento foi criado com sucesso.",
        duration: 4000,
      });
    },
    onError: (error) => {
      console.error("Erro ao criar agendamento:", error);

      // Tratar diferentes tipos de erro com mensagens amigáveis
      let mensagemErro = "Erro ao criar agendamento";
      let descricao = "";

      if (error.message.includes("já existe um agendamento")) {
        mensagemErro = "⚠️ Horário ocupado";
        descricao = "Já existe um agendamento para este horário";
      } else if (error.message.includes("horário não está disponível")) {
        mensagemErro = "⏰ Horário indisponível";
        descricao = "Este horário não está mais disponível";
      } else if (error.message.includes("fora do funcionamento")) {
        mensagemErro = "🏢 Fora do funcionamento";
        descricao = "Horário fora do funcionamento da barbearia";
      } else if (error.message.includes("data inválida")) {
        mensagemErro = "📅 Data inválida";
        descricao = "Data selecionada é inválida";
      } else if (error.message.includes("cliente não encontrado")) {
        mensagemErro = "👤 Cliente não encontrado";
        descricao = "Cliente não encontrado no sistema";
      } else if (error.message.includes("serviço não encontrado")) {
        mensagemErro = "✂️ Serviço não encontrado";
        descricao = "Serviço não encontrado no sistema";
      } else if (error.message && error.message.length > 0) {
        mensagemErro = "❌ Erro no agendamento";
        descricao = error.message;
      }

      toast.error(mensagemErro, {
        description: descricao,
        duration: 5000,
        action: {
          label: "Tentar novamente",
          onClick: () => {
            // Reabrir o modal para tentar novamente
            setOpen(true);
          },
        },
      });
    },
  });

  const resetForm = () => {
    setHorario("");
    setHorarioInput("");
    setServico("");
    setClienteId(null);
    setClienteNomeSelecionado("");
    setClienteQuery("");
    setDataParaAgendamento(new Date());
    setMostrarListaClientes(false);
  };

  // Função para lidar com mudança no input de busca de cliente
  const handleClienteQueryChange = (value: string) => {
    console.log("🔍 Mudança na busca de cliente:", value);
    setClienteQuery(value);

    // Se o campo foi limpo, resetar seleção
    if (!value.trim()) {
      setClienteId(null);
      setClienteNomeSelecionado("");
      setMostrarListaClientes(false);
    } else {
      // Se há texto, mostrar lista quando houver resultados
      setMostrarListaClientes(true);
      // Limpar seleção anterior se o texto mudou
      if (clienteNomeSelecionado && value !== clienteNomeSelecionado) {
        setClienteId(null);
        setClienteNomeSelecionado("");
      }
    }
  };

  // Função para selecionar um cliente
  const handleSelecionarCliente = (cliente: {
    id: string | number;
    nome: string;
  }) => {
    console.log("👤 Selecionando cliente:", cliente);

    const clienteIdString = cliente.id.toString();
    setClienteId(clienteIdString);
    setClienteNomeSelecionado(cliente.nome);
    setClienteQuery(cliente.nome);
    setMostrarListaClientes(false);

    console.log("✅ Cliente selecionado:", {
      id: clienteIdString,
      nome: cliente.nome,
    });
  };

  // Controlar exibição da lista de clientes
  useEffect(() => {
    if (
      clienteQuery.length > 1 &&
      !clienteId &&
      clientesEncontrados &&
      clientesEncontrados.length > 0
    ) {
      setMostrarListaClientes(true);
    } else {
      setMostrarListaClientes(false);
    }
  }, [clienteQuery, clienteId, clientesEncontrados]);

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

  const datasComCorte =
    cortesDoMes?.map((corte) =>
      dayjs(corte.dataHora).startOf("day").toDate(),
    ) ?? [];
  console.log(
    "datasComCorte:",
    datasComCorte.map((d) => d.toDateString()),
  );

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

  // Modificar a função handleNovoAgendamento para garantir que o clienteId seja tratado corretamente
  const handleNovoAgendamento = () => {
    if (createMutation.isPending) return;

    if (!clienteId) {
      toast.error("👤 Cliente obrigatório", {
        description: "Selecione um cliente válido para continuar.",
        duration: 4000,
      });
      return;
    }

    if (!horario || !validarHorario(horario)) {
      toast.error("⏰ Horário inválido", {
        description: "Digite um horário válido no formato HH:MM.",
        duration: 4000,
      });
      return;
    }

    if (!servico) {
      toast.error("✂️ Serviço obrigatório", {
        description: "Selecione um serviço para continuar.",
        duration: 4000,
      });
      return;
    }

    if (conflito?.temConflito) {
      toast.error("⚠️ Horário ocupado", {
        description: "Este horário está ocupado. Selecione outro horário.",
        duration: 4000,
        action: conflito.proximoDisponivel
          ? {
              label: `Usar ${conflito.proximoDisponivel}`,
              onClick: () => {
                setHorario(conflito.proximoDisponivel!);
                setHorarioInput(conflito.proximoDisponivel!);
              },
            }
          : undefined,
      });
      return;
    }

    console.log("🚀 Criando agendamento com dados:", {
      clienteId,
      clienteIdType: typeof clienteId,
      data: format(dataParaAgendamento, "yyyy-MM-dd"),
      horario,
      servico,
      status: "agendado",
    });

    createMutation.mutate({
      clienteId,
      data: format(dataParaAgendamento, "yyyy-MM-dd"),
      horario,
      servico,
      status: "agendado",
    });
  };

  console.log("Query mês/ano enviados:", {
    month: selectedDate.getMonth() + 1,
    year: selectedDate.getFullYear(),
  });

  // Verificar se a data é hoje para não permitir voltar para datas passadas
  const podeVoltarData = dayjs(dataParaAgendamento).isAfter(dayjs(), "day");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "concluido":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "cancelado":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
        Agendamentos
      </h1>

      {isMobile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          </TabsList>
          <TabsContent value="calendario" className="mt-4">
            <Card className="w-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Calendário</CardTitle>
                <CardDescription>
                  Navegue entre as datas para ver os agendamentos
                </CardDescription>
              </CardHeader>

              <CardContent>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="border-border bg-card mx-auto w-full rounded-md border p-2 text-[16px]"
                  modifiers={{
                    hasAppointments: datasComCorte,
                  }}
                  modifiersStyles={{
                    hasAppointments: {
                      backgroundColor: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                      fontWeight: "bold",
                    },
                  }}
                />

                <div className="mt-4">
                  <h3 className="text-foreground mb-2 text-base font-semibold">
                    Cortes do mês
                  </h3>
                  <p className="text-muted-foreground mb-3 text-xs">
                    {format(selectedDate, "MMMM/yyyy", { locale: ptBR })}
                  </p>

                  {cortesDoMes?.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      Nenhum corte registrado neste mês.
                    </p>
                  )}

                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {cortesDoMes?.map((corte) => (
                      <div
                        key={corte.id}
                        className="border-border bg-card flex items-center justify-between rounded border p-2"
                      >
                        <div>
                          <p className="text-foreground text-sm font-medium">
                            {corte.cliente?.nome ?? "Cliente desconhecido"}
                          </p>
                          <p className="text-muted-foreground text-xs">
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
          </TabsContent>
          <TabsContent value="agendamentos" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">
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
                      size="sm"
                      className="flex cursor-pointer items-center gap-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span className="sr-only md:not-sr-only">Novo</span>
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="bg-background/95 max-h-[90vh] max-w-2xl overflow-y-auto backdrop-blur-sm sm:max-w-[425px] md:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Novo Agendamento</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-4">
                      {/* Seletor de cliente */}
                      <div className="relative">
                        <label className="text-foreground text-sm font-medium">
                          Buscar cliente *
                        </label>
                        <input
                          type="text"
                          value={clienteQuery}
                          onChange={(e) =>
                            handleClienteQueryChange(e.target.value)
                          }
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

                        {/* Lista de clientes encontrados */}
                        {mostrarListaClientes &&
                          !isFetching &&
                          clientesEncontrados &&
                          clientesEncontrados.length > 0 && (
                            <div className="border-border absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded border bg-black/90 shadow-md backdrop-blur-md">
                              {clientesEncontrados.map((cliente) => (
                                <div
                                  key={cliente.id}
                                  className="hover:bg-accent cursor-pointer px-3 py-2 text-sm transition-colors"
                                  onClick={() =>
                                    handleSelecionarCliente(cliente)
                                  }
                                >
                                  <div className="font-medium">
                                    {cliente.nome}
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    ID: {cliente.id}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Mensagem quando não encontra clientes */}
                        {!isFetching &&
                          clienteQuery.length > 1 &&
                          clientesEncontrados &&
                          clientesEncontrados.length === 0 && (
                            <div className="border-destructive bg-destructive/10 text-destructive mt-2 flex flex-col items-center gap-2 rounded border p-3">
                              <p>Cliente não encontrado.</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() =>
                                  window.open("/dashboard/clientes", "_blank")
                                }
                              >
                                Criar novo cliente
                              </Button>
                            </div>
                          )}

                        {/* Confirmação de cliente selecionado */}
                        {clienteId && clienteNomeSelecionado && (
                          <div className="mt-2 flex items-center justify-between rounded border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950/20">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              ✓ Cliente selecionado:{" "}
                              <strong>{clienteNomeSelecionado}</strong>
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setClienteId(null);
                                setClienteNomeSelecionado("");
                                setClienteQuery("");
                                setMostrarListaClientes(false);
                              }}
                              className="h-6 w-6 p-0 text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
                            >
                              ×
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Navegação de data */}
                      <div>
                        <label className="text-foreground text-sm font-medium">
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

                          <div className="border-input bg-background flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2">
                            <Calendar className="text-muted-foreground h-4 w-4" />
                            <span className="text-foreground text-sm font-medium">
                              {format(
                                dataParaAgendamento,
                                "EEEE, dd 'de' MMMM",
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
                        <label className="text-foreground text-sm font-medium">
                          Serviço *
                        </label>
                        <Select
                          value={servico}
                          onValueChange={(value) => {
                            setServico(value);
                            setHorario(""); // Limpar horário quando mudar serviço
                            setHorarioInput("");
                          }}
                        >
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>

                          <SelectContent className="bg-popover backdrop-blur-sm">
                            {servicosDisponiveis?.map((s) => (
                              <SelectItem
                                className="cursor-pointer"
                                key={s.nome}
                                value={s.nome}
                              >
                                {s.nome} - R$ {s.preco.toFixed(2)} (
                                {s.duracaoMinutos ?? 30}min)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Intervalos de funcionamento */}
                      {horariosData?.intervalos &&
                        horariosData.intervalos.length > 0 && (
                          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                            <div className="mb-2 flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                Funcionamento em{" "}
                                {format(dataParaAgendamento, "EEEE", {
                                  locale: ptBR,
                                })}
                                :
                              </span>
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              {horariosData.intervalos.map(
                                (intervalo, index) => (
                                  <span key={index}>
                                    {intervalo.inicio} às {intervalo.fim}
                                    {index <
                                      horariosData.intervalos.length - 1 &&
                                      " • "}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Campo manual de horário */}
                      <div>
                        <label className="text-foreground text-sm font-medium">
                          Horário desejado *
                        </label>
                        <div className="relative mt-1">
                          <input
                            type="text"
                            value={horarioInput}
                            onChange={(e) =>
                              handleHorarioChange(e.target.value)
                            }
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
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                              Horário inválido. Use o formato HH:MM (ex: 14:30)
                            </p>
                          )}
                      </div>

                      {/* Horários sugeridos */}
                      {servico && dataParaAgendamento && (
                        <div>
                          <label className="text-foreground text-sm font-medium">
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
                            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
                              <p className="text-sm text-red-700 dark:text-red-300">
                                {horariosData.erro}
                              </p>
                            </div>
                          )}

                          {horariosData?.horarios &&
                            horariosData.horarios.length > 0 && (
                              <div className="mt-2 grid max-h-32 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
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
                          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              <div>
                                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                  Este horário já está ocupado!
                                </p>
                                {conflito.proximoDisponivel && (
                                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                                    Horário mais próximo disponível:{" "}
                                    {conflito.proximoDisponivel}
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="ml-2 h-auto cursor-pointer p-0 text-yellow-700 underline dark:text-yellow-300"
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
                          <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                Horário {horario} disponível para agendamento!
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Botões */}
                      <div className="flex justify-end gap-2 pt-4">
                        <DialogClose asChild>
                          <Button className="cursor-pointer" variant="ghost">
                            Cancelar
                          </Button>
                        </DialogClose>
                        <Button
                          onClick={handleNovoAgendamento}
                          disabled={
                            createMutation.isPending ||
                            !clienteId ||
                            !horario ||
                            !validarHorario(horario) ||
                            !servico ||
                            conflito?.temConflito
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
                        <p className="text-foreground font-medium">
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
                          className="cursor-pointer"
                          onClick={() =>
                            atualizarStatus.mutate({
                              id: agendamento.id,
                              status: "concluido",
                            })
                          }
                          disabled={atualizarStatus.isPending}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Confirmar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() =>
                            atualizarStatus.mutate({
                              id: agendamento.id,
                              status: "cancelado",
                            })
                          }
                          disabled={atualizarStatus.isPending}
                        >
                          <XIcon className="mr-1 h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Layout para desktop (similar ao mobile, mas com layout diferente)
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
                  className="border-border bg-card mx-auto w-full rounded-md border p-2 text-[16px]"
                  modifiers={{
                    hasAppointments: datasComCorte,
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
                <h3 className="text-foreground mb-2 text-lg font-semibold">
                  Cortes do mês
                </h3>
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
                      className="border-border bg-card flex items-center justify-between rounded border p-2"
                    >
                      <div>
                        <p className="text-foreground font-medium">
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

                <DialogContent className="bg-background/95 max-h-[90vh] max-w-2xl overflow-y-auto backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle>Novo Agendamento</DialogTitle>
                  </DialogHeader>

                  <div className="flex flex-col gap-4 py-4">
                    {/* Seletor de cliente - mesmo código do mobile */}
                    <div className="relative">
                      <label className="text-foreground text-sm font-medium">
                        Buscar cliente *
                      </label>
                      <input
                        type="text"
                        value={clienteQuery}
                        onChange={(e) =>
                          handleClienteQueryChange(e.target.value)
                        }
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

                      {/* Lista de clientes encontrados */}
                      {mostrarListaClientes &&
                        !isFetching &&
                        clientesEncontrados &&
                        clientesEncontrados.length > 0 && (
                          <div className="border-border bg-popover absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded border shadow-md backdrop-blur-sm">
                            {clientesEncontrados.map((cliente) => (
                              <div
                                key={cliente.id}
                                className="hover:bg-accent cursor-pointer px-3 py-2 text-sm transition-colors"
                                onClick={() => handleSelecionarCliente(cliente)}
                              >
                                <div className="font-medium">
                                  {cliente.nome}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  ID: {cliente.id}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Mensagem quando não encontra clientes */}
                      {!isFetching &&
                        clienteQuery.length > 1 &&
                        clientesEncontrados &&
                        clientesEncontrados.length === 0 && (
                          <div className="border-destructive bg-destructive/10 text-destructive mt-2 flex flex-col items-center gap-2 rounded border p-3">
                            <p>Cliente não encontrado.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() =>
                                window.open("/dashboard/clientes", "_blank")
                              }
                            >
                              Criar novo cliente
                            </Button>
                          </div>
                        )}

                      {/* Confirmação de cliente selecionado */}
                      {clienteId && clienteNomeSelecionado && (
                        <div className="mt-2 flex items-center justify-between rounded border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950/20">
                          <p className="text-sm text-green-700 dark:text-green-300">
                            ✓ Cliente selecionado:{" "}
                            <strong>{clienteNomeSelecionado}</strong>
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setClienteId(null);
                              setClienteNomeSelecionado("");
                              setClienteQuery("");
                              setMostrarListaClientes(false);
                            }}
                            className="h-6 w-6 p-0 text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Resto do formulário igual ao mobile... */}
                    {/* Por brevidade, mantendo apenas a parte do cliente que foi modificada */}
                    {/* O resto dos campos (data, serviço, horário, etc.) permanecem iguais */}

                    {/* Navegação de data */}
                    <div>
                      <label className="text-foreground text-sm font-medium">
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

                        <div className="border-input bg-background flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2">
                          <Calendar className="text-muted-foreground h-4 w-4" />
                          <span className="text-foreground font-medium">
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
                      <label className="text-foreground text-sm font-medium">
                        Serviço *
                      </label>
                      <Select
                        value={servico}
                        onValueChange={(value) => {
                          setServico(value);
                          setHorario(""); // Limpar horário quando mudar serviço
                          setHorarioInput("");
                        }}
                      >
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>

                        <SelectContent className="bg-popover backdrop-blur-sm">
                          {servicosDisponiveis?.map((s) => (
                            <SelectItem
                              className="cursor-pointer"
                              key={s.nome}
                              value={s.nome}
                            >
                              {s.nome} - R$ {s.preco.toFixed(2)} (
                              {s.duracaoMinutos ?? 30}min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Campo manual de horário */}
                    <div>
                      <label className="text-foreground text-sm font-medium">
                        Horário desejado *
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
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            Horário inválido. Use o formato HH:MM (ex: 14:30)
                          </p>
                        )}
                    </div>

                    {/* Botões */}
                    <div className="flex justify-end gap-2 pt-4">
                      <DialogClose asChild>
                        <Button className="cursor-pointer" variant="ghost">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button
                        onClick={handleNovoAgendamento}
                        disabled={
                          createMutation.isPending ||
                          !clienteId ||
                          !horario ||
                          !validarHorario(horario) ||
                          !servico ||
                          conflito?.temConflito
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

            <CardContent className="space-y-4">
              {agendamentos?.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Nenhum agendamento para esta data.
                </p>
              )}
              {agendamentos?.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="border-border bg-card flex items-center justify-between rounded border p-4"
                >
                  <div>
                    <p className="text-foreground font-medium">
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
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-1 text-xs capitalize ${getStatusColor(agendamento.status)}`}
                    >
                      {agendamento.status}
                    </span>
                    {agendamento.status === "agendado" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() =>
                            atualizarStatus.mutate({
                              id: agendamento.id,
                              status: "concluido",
                            })
                          }
                          disabled={atualizarStatus.isPending}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Confirmar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() =>
                            atualizarStatus.mutate({
                              id: agendamento.id,
                              status: "cancelado",
                            })
                          }
                          disabled={atualizarStatus.isPending}
                        >
                          <XIcon className="mr-1 h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
