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

const aplicarMascaraHorario = (valor: string): string => {
  const numeros = valor.replace(/\D/g, "");
  if (numeros.length === 0) return "";
  if (numeros.length <= 2) return numeros;
  if (numeros.length === 3) return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
  const hora = Math.min(Number(numeros.slice(0, 2)), 23).toString().padStart(2, '0');
  const minuto = Math.min(Number(numeros.slice(2, 4)), 59).toString().padStart(2, '0');
  return `${hora}:${minuto}`;
};

const validarHorario = (horario: string): boolean => {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horario);
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

  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);

  const { data: agendamentosDoMes, refetch: refetchAgendamentosDoMes } = api.agendamento.getAgendamentosDoMes.useQuery({
    month: selectedDate.getMonth() + 1,
    year: selectedDate.getFullYear(),
  });

  const { data: agendamentosRecentes } = api.agendamento.getAgendamentosRecentes.useQuery();

  const { data: clientesEncontrados, isFetching } =
    api.agendamento.getByClientCode.useQuery(
      { query: clienteQuery },
      {
        enabled: clienteQuery.length > 1,
        placeholderData: (previousData) => previousData,
      },
    );

  const { data: servicosDisponiveis } = api.agendamento.getServicos.useQuery();

  const { data: conflito } = api.agendamento.verificarConflito.useQuery(
    {
      data: format(dataParaAgendamento, "yyyy-MM-dd"),
      horario: horario,
      servico: servico,
    },
    {
      enabled: !!horario && !!servico && !!dataParaAgendamento && validarHorario(horario),
      refetchOnWindowFocus: false,
    },
  );

  const { data: agendamentos, refetch: refetchAgendamentos } =
    api.agendamento.getByData.useQuery({
      date: selectedDate.toISOString(),
    });

  const atualizarStatus = api.agendamento.atualizarStatus.useMutation({
    onSuccess: () => {
      void refetchAgendamentos();
      void refetchAgendamentosDoMes();
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createMutation = api.agendamento.create.useMutation({
    onSuccess: () => {
      void refetchAgendamentos();
      void refetchAgendamentosDoMes();
      setOpen(false);
      resetForm();
      toast.success("🎉 Agendamento criado!", {
        description: "O agendamento foi criado com sucesso.",
        duration: 4000,
      });
    },
    onError: (error) => {
      toast.error("Erro ao criar agendamento", {
        description: error.message,
        duration: 5000,
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

  const handleClienteQueryChange = (value: string) => {
    setClienteQuery(value);
    if (!value.trim() || value.length < 2) {
      setClienteId(null);
      setClienteNomeSelecionado("");
      setMostrarListaClientes(false);
    } else {
      // Só mostrar lista se não for um cliente já selecionado
      if (clienteNomeSelecionado && value === clienteNomeSelecionado) {
        setMostrarListaClientes(false);
      } else {
        setMostrarListaClientes(true);
        if (clienteNomeSelecionado && value !== clienteNomeSelecionado) {
          setClienteId(null);
          setClienteNomeSelecionado("");
        }
      }
    }
  };

  const handleSelecionarCliente = (cliente: { id: string | number; nome: string; telefone: string; }) => {
    setClienteId(cliente.id.toString());
    setClienteNomeSelecionado(cliente.nome);
    setClienteQuery(cliente.nome);
    setMostrarListaClientes(false);
  };

  useEffect(() => {
    if (clienteQuery.length > 1 && !clienteId && clientesEncontrados && clientesEncontrados.length > 0 && clienteQuery !== clienteNomeSelecionado) {
      setMostrarListaClientes(true);
    } else if (clienteQuery.length <= 1 || clienteQuery === clienteNomeSelecionado || !clientesEncontrados || clientesEncontrados.length === 0) {
      setMostrarListaClientes(false);
    }
  }, [clienteQuery, clienteId, clientesEncontrados, clienteNomeSelecionado]);

  const navegarData = (direcao: "anterior" | "proxima") => {
    const novaData = dayjs(dataParaAgendamento).add(direcao === "proxima" ? 1 : -1, 'day').toDate();
    setDataParaAgendamento(novaData);
    setHorario("");
    setHorarioInput("");
  };

  const datasComAgendamento = agendamentosDoMes?.map((agendamento) => dayjs(agendamento.dataHora).startOf("day").toDate()) ?? [];

  const handleHorarioChange = (valor: string) => {
    const valorComMascara = aplicarMascaraHorario(valor);
    setHorarioInput(valorComMascara);
    if (validarHorario(valorComMascara)) {
      setHorario(valorComMascara);
    } else {
      setHorario("");
    }
  };

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
        toast.error("Horário ocupado", { description: "Este horário está ocupado. Selecione outro." });
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

  const podeVoltarData = dayjs(dataParaAgendamento).isAfter(dayjs(), "day");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "concluido": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "cancelado": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
        setSelectedDate(date);
        if (isMobile) {
            setActiveTab("agendamentos");
        }
    }
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
          Agendamentos
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer" onClick={() => setDataParaAgendamento(new Date())}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Novo Agendamento - {format(dataParaAgendamento, "dd/MM/yyyy")}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="relative">
                <label htmlFor="cliente" className="text-foreground text-sm font-medium">Cliente</label>
                <input 
                  id="cliente" 
                  type="text" 
                  value={clienteQuery} 
                  onChange={(e) => handleClienteQueryChange(e.target.value)} 
                  placeholder="Buscar por nome ou telefone..." 
                  className="bg-background border-border mt-1 block w-full rounded-md border p-2" 
                  autoComplete="off" 
                />
                {isFetching && (
                  <div className="absolute right-2 top-9">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {mostrarListaClientes && clientesEncontrados && clientesEncontrados.length > 0 && (
                  <ul className="bg-background border-border absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border shadow-lg">
                    {clientesEncontrados.map((c) => (
                      <li 
                        key={c.id} 
                        onClick={() => handleSelecionarCliente(c)} 
                        className="cursor-pointer px-3 py-2 hover:bg-muted"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{c.nome}</span>
                          <span className="text-sm text-muted-foreground">{c.telefone}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-foreground text-sm font-medium">Data</label>
                  <p className="mt-1 text-base font-semibold">{format(dataParaAgendamento, "dd/MM/yyyy")}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => navegarData("anterior")} 
                  disabled={!podeVoltarData}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => navegarData("proxima")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <label htmlFor="servico" className="text-foreground text-sm font-medium">Serviço</label>
                <Select onValueChange={setServico} value={servico}>
                  <SelectTrigger className="cursor-pointer bg-background border-border mt-1 w-full">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent
                  className="bg-background"
                  >
                    {servicosDisponiveis?.map((s) => (
                      <SelectItem 
                      className="cursor-pointer" 
                      key={s.nome}
                      value={s.nome}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="horario" className="text-foreground text-sm font-medium">Horário (HH:MM)</label>
                <input 
                  id="horario" 
                  type="text" 
                  value={horarioInput} 
                  onChange={(e) => handleHorarioChange(e.target.value)} 
                  placeholder="Ex: 14:30" 
                  className="bg-background border-border mt-1 block w-full rounded-md border p-2" 
                  maxLength={5}
                />
                {conflito?.temConflito && (
                  <p className="mt-1 text-sm text-red-600">
                    {conflito.motivo}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                className="cursor-pointer"
                onClick={handleNovoAgendamento} 
                disabled={createMutation.isPending || !!conflito?.temConflito}
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Agendamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isMobile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendario">Calendário</TabsTrigger>
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          </TabsList>
          <TabsContent value="calendario" className="mt-4">
            <Card className="w-full">
              <CardContent className="flex justify-center p-6">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  modifiers={{ hasAppointments: datasComAgendamento }}
                  modifiersClassNames={{
                    hasAppointments: "bg-primary text-primary-foreground",
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="agendamentos" className="mt-4">
             {/* Listagem de agendamentos para mobile */}
             <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </CardTitle>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setDataParaAgendamento(selectedDate);
                        setOpen(true);
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agendar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                {agendamentos?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum agendamento para esta data.</p>
                ) : (
                  <div className="space-y-4">
                    {agendamentos?.map((agendamento) => (
                      <div key={agendamento.id} className="border-border flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">{dayjs(agendamento.dataHora).format("HH:mm")}</p>
                            <p className="text-sm text-muted-foreground">{agendamento.cliente?.nome}</p>
                          </div>
                        </div>
                        <div className="text-right">
                            <p className="font-medium">{agendamento.servico}</p>
                            <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(agendamento.status ?? "")}`}>{agendamento.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Desktop view
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Calendário</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center p-6">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  className="rounded-md border shadow-sm"
                  modifiers={{ hasAppointments: datasComAgendamento }}
                  modifiersClassNames={{
                    hasAppointments: "bg-primary text-primary-foreground",
                  }}
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                 <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Agendamentos de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</CardTitle>
                        <CardDescription>{agendamentos?.length ?? 0} agendamentos encontrados</CardDescription>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setDataParaAgendamento(selectedDate);
                        setOpen(true);
                      }}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agendamento Rápido
                    </Button>
                 </div>
              </CardHeader>
              <CardContent>
                {agendamentos?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted" />
                    <p className="text-muted-foreground text-lg font-medium">Nenhum agendamento para esta data.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agendamentos?.map((agendamento) => (
                      <div key={agendamento.id} className="border-border flex items-center justify-between rounded-lg border p-4 transition-all hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                           <Clock className="h-5 w-5 text-muted-foreground" />
                           <div>
                              <p className="font-semibold">{dayjs(agendamento.dataHora).format("HH:mm")}</p>
                              <p className="text-sm text-muted-foreground">{agendamento.cliente?.nome}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-medium">{agendamento.servico}</p>
                                <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(agendamento.status ?? "")}`}>{agendamento.status}</span>
                            </div>
                            <Select value={agendamento.status ?? ""} onValueChange={(newStatus) => { atualizarStatus.mutate({ id: agendamento.id, status: newStatus as "agendado" | "cancelado" | "concluido", }); }}>
                                <SelectTrigger className="w-auto border-none bg-transparent focus:ring-0"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agendado"><div className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500"/>Agendado</div></SelectItem>
                                    <SelectItem value="concluido"><div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500"/>Concluído</div></SelectItem>
                                    <SelectItem value="cancelado"><div className="flex items-center gap-2"><XIcon className="h-4 w-4 text-red-500"/>Cancelado</div></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Seção de Agendamentos Recentes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Próximos Agendamentos
          </CardTitle>
          <CardDescription>
            Agendamentos confirmados para os próximos 7 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agendamentosRecentes && agendamentosRecentes.length > 0 ? (
            <div className="space-y-3">
              {agendamentosRecentes.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{agendamento.cliente?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {agendamento.servico}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {dayjs(agendamento.dataHora).format("DD/MM")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dayjs(agendamento.dataHora).format("HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium text-muted-foreground">
                  Nenhum agendamento próximo
                </p>
                <p className="text-sm text-muted-foreground">
                  Os próximos agendamentos aparecerão aqui
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
