"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronRight,
  ChevronLeft,
  Star,
  MapPin,
  Phone,
  Clock,
  Users,
  Award,
  Sparkles,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  CalendarDays,
} from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import Image from "next/image";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import {
  LayoutPanelLeftIcon as CalendarLeft,
  PanelRightIcon as CalendarRight,
} from "lucide-react";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // const [clienteEncontrado, setClienteEncontrado] = useState<any>(null);

  // Define interface para o cliente
  interface Cliente {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
  }
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(
    null,
  );

  // Estados para agendamento
  const [telefoneAgendamento, setTelefoneAgendamento] = useState("");
  const [nomeNovoCliente, setNomeNovoCliente] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState<Date | null>(null);
  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [etapaAgendamento, setEtapaAgendamento] = useState<
    "telefone" | "dados" | "servico" | "horario" | "confirmacao"
  >("telefone");
  const [agendamentoSucesso, setAgendamentoSucesso] = useState(false);
  const [horarioManual, setHorarioManual] = useState("");
  const [horarioManualValido, setHorarioManualValido] = useState(false);
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const [mesAtual, setMesAtual] = useState(dayjs());

  // Definir limites de data para agendamentos
  const hoje = dayjs();
  const dataMaxima = hoje.add(30, "days"); // Máximo 30 dias no futuro

  // Busca parceiros (tipo "parceria")
  const { data: parcerias } = api.linktree.listarParcerias.useQuery();

  // Busca clientes (tipo "cliente")
  const {
    data: clientes,
    isLoading: loadingClientes,
    isError: errorClientes,
  } = api.linktree.listarClientes.useQuery();

  // Busca configurações da barbearia
  const { data: configs } = api.configuracao.listar.useQuery();

  // Queries para agendamento
  const { data: servicosDisponiveis } = api.agendamento.getServicos.useQuery();

  const { data: clientePorTelefone, isLoading: buscandoCliente } =
    api.cliente.buscarPorTelefone.useQuery(
      { telefone: telefoneAgendamento },
      {
        enabled: telefoneAgendamento.length >= 10,
      },
    );

  const { data: horariosDisponiveis, isLoading: carregandoHorarios } =
    api.agendamento.getHorariosDisponiveisPorData.useQuery(
      {
        data: dataAgendamento?.toISOString().split("T")[0] ?? "",
        servico: servicoSelecionado,
      },
      {
        enabled: !!dataAgendamento && !!servicoSelecionado,
      },
    );

  const criarAgendamentoMutation =
    api.agendamento.criarAgendamentoPublico.useMutation({
      onSuccess: () => {
        setAgendamentoSucesso(true);
        setEtapaAgendamento("confirmacao");
      },
      onError: (error) => {
        alert(`Erro ao criar agendamento: ${error.message}`);
      },
    });

  const handleLogin = () => {
    // Aqui você pode implementar a lógica de login
    // Por enquanto, vamos redirecionar para o dashboard
    window.location.href = "/dashboard";
  };

  // Funções para agendamento
  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return valor;
  };

  const limparTelefone = (valor: string) => {
    return valor.replace(/\D/g, "");
  };

  const resetarAgendamento = () => {
    setTelefoneAgendamento("");
    setClienteEncontrado(null);
    setNomeNovoCliente("");
    setDataAgendamento(null);
    setServicoSelecionado("");
    setHorarioSelecionado("");
    setEtapaAgendamento("telefone");
    setAgendamentoSucesso(false);
  };

  const confirmarAgendamento = () => {
    if (!dataAgendamento || !horarioSelecionado || !servicoSelecionado) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    const telefoneNumeros = limparTelefone(telefoneAgendamento);

    criarAgendamentoMutation.mutate({
      nome: nomeNovoCliente || "",
      telefone: telefoneNumeros,
      data: dataAgendamento.toISOString().split("T")[0] ?? "",
      horario: horarioSelecionado,
      servico: servicoSelecionado,
    });
  };

  const nextSlide = useCallback(() => {
    if (parcerias && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide((prev) => (prev + 1) % parcerias.length);
      setTimeout(() => setIsTransitioning(false), 400);
    }
  }, [parcerias, isTransitioning]);

  const prevSlide = () => {
    if (parcerias && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide(
        (prev) => (prev - 1 + parcerias.length) % parcerias.length,
      );
      setTimeout(() => setIsTransitioning(false), 400);
    }
  };

  const goToSlide = (index: number) => {
    if (!isTransitioning && index !== currentSlide) {
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 400);
    }
  };

  const getSlideIndex = (offset: number) => {
    if (!parcerias) return 0;
    return (currentSlide + offset + parcerias.length) % parcerias.length;
  };

  useEffect(() => {
    if (parcerias && parcerias.length > 1) {
      const interval = setInterval(nextSlide, 6000);
      return () => clearInterval(interval);
    }
  }, [parcerias, nextSlide]);

  useEffect(() => {
    dayjs.locale("pt-br");
  }, []);

  const { data: conflito, isLoading: conflitoLoading } =
    api.agendamento.verificarConflito.useQuery(
      {
        data: dataAgendamento?.toISOString().split("T")[0] ?? "",
        horario: horarioManual ?? "",
        servico: servicoSelecionado ?? "",
      },
      { enabled: !!dataAgendamento && !!horarioManual && !!servicoSelecionado },
    );
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header/Navigation */}
      <header className="relative z-10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500">
              <span className="text-lg font-bold text-white">D</span>
            </div>
            <span className="text-xl font-bold text-white">
              {configs?.nome}
            </span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#agendamento"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Agendar
            </a>
            <a
              href="#clientes"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Clientes
            </a>
            <a
              href="#parceiros"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Parceiros
            </a>

            <Button
              onClick={() => setShowLogin(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              Entrar
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10" />
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-6 border-amber-500/30 bg-amber-500/20 text-amber-300">
            <Sparkles className="mr-2 h-4 w-4" />
            Experiência Premium
          </Badge>

          <h1 className="mb-6 text-5xl font-bold text-white md:text-7xl">
            Estilo que
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              {" "}
              Transforma
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            Mais que um corte, uma experiência completa. Tradição, qualidade e
            inovação em cada atendimento para o homem moderno.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() =>
                document
                  .getElementById("agendamento")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-semibold text-white hover:from-amber-600 hover:to-orange-600"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Agendar Horário
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                document
                  .getElementById("parceiros")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Ver Parceiros
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-gray-400">Clientes Satisfeitos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">5★</div>
              <div className="text-gray-400">Avaliação Média</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">3+</div>
              <div className="text-gray-400">Anos de Experiência</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">15+</div>
              <div className="text-gray-400">Serviços Oferecidos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Informações da Barbearia */}
      {configs && (
        <section className="px-6 py-16">
          <div className="container mx-auto max-w-4xl">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                    <MapPin className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Localização</h3>
                    <p className="text-sm text-gray-400">
                      {configs.endereco || "Endereço não informado"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                    <Phone className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Contato</h3>
                    <p className="text-sm text-gray-400">
                      {configs.telefone || "Telefone não informado"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Horário</h3>
                    <p className="text-sm text-gray-400">
                      {configs.horaInicio} às {configs.horaFim}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Seção de Agendamento */}
      <section id="agendamento" className="bg-black/30 px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white">
              <Calendar className="mr-3 inline h-8 w-8 text-amber-400" />
              Agende Seu Horário
            </h2>
            <p className="text-lg text-gray-400">
              Faça seu agendamento de forma rápida e prática
            </p>
          </div>

          <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <CardContent className="p-8">
              {!agendamentoSucesso ? (
                <>
                  {/* Etapa 1: Telefone */}
                  {etapaAgendamento === "telefone" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                          <Phone className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-white">
                          Informe seu telefone
                        </h3>
                        <p className="text-gray-400">
                          Vamos verificar se você já é nosso cliente
                        </p>
                      </div>

                      <div className="mx-auto max-w-md space-y-4">
                        <div>
                          <Label htmlFor="telefone" className="text-white">
                            Telefone
                          </Label>
                          <Input
                            id="telefone"
                            type="tel"
                            placeholder="(11) 99999-9999"
                            value={telefoneAgendamento}
                            onChange={(e) => {
                              const valorFormatado = formatarTelefone(
                                e.target.value,
                              );
                              setTelefoneAgendamento(valorFormatado);
                            }}
                            className="mt-2 border-gray-600 bg-gray-700 text-white"
                            maxLength={15}
                          />
                        </div>

                        {buscandoCliente && (
                          <div className="flex items-center justify-center gap-2 text-amber-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Verificando...</span>
                          </div>
                        )}

                        <Button
                          onClick={() => {
                            const telefoneNumeros =
                              limparTelefone(telefoneAgendamento);
                            if (telefoneNumeros.length >= 10) {
                              // Verificar se já temos os dados da query
                              if (clientePorTelefone) {
                                setClienteEncontrado({
                                  ...clientePorTelefone,
                                  email: clientePorTelefone.email ?? undefined,
                                });
                                setNomeNovoCliente(clientePorTelefone.nome);
                                setEtapaAgendamento("servico");
                              } else if (
                                clientePorTelefone === null &&
                                !buscandoCliente
                              ) {
                                // Cliente não encontrado e query já terminou
                                setClienteEncontrado(null);
                                setEtapaAgendamento("dados");
                              } else if (buscandoCliente) {
                                // Ainda carregando, não fazer nada
                                return;
                              } else {
                                // Forçar a execução da query se ainda não foi executada
                                // Isso não deveria acontecer, mas é uma segurança
                                alert("Aguarde a verificação do telefone");
                              }
                            } else {
                              alert("Digite um telefone válido");
                            }
                          }}
                          disabled={
                            limparTelefone(telefoneAgendamento).length < 10 ||
                            buscandoCliente
                          }
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                        >
                          Continuar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Etapa 2: Dados do novo cliente */}
                  {etapaAgendamento === "dados" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                          <User className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-white">
                          Novo cliente
                        </h3>
                        <p className="text-gray-400">
                          Precisamos de algumas informações básicas
                        </p>
                      </div>

                      <div className="mx-auto max-w-md space-y-4">
                        <div>
                          <Label htmlFor="nome" className="text-white">
                            Nome completo
                          </Label>
                          <Input
                            id="nome"
                            type="text"
                            placeholder="Seu nome completo"
                            value={nomeNovoCliente}
                            onChange={(e) => setNomeNovoCliente(e.target.value)}
                            className="mt-2 border-gray-600 bg-gray-700 text-white"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Telefone</Label>
                          <Input
                            value={telefoneAgendamento}
                            disabled
                            className="mt-2 border-gray-500 bg-gray-600 text-gray-300"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setEtapaAgendamento("telefone")}
                            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Voltar
                          </Button>
                          <Button
                            onClick={() => {
                              if (nomeNovoCliente.trim()) {
                                setEtapaAgendamento("servico");
                              } else {
                                alert("Digite seu nome");
                              }
                            }}
                            disabled={!nomeNovoCliente.trim()}
                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                          >
                            Continuar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 3: Seleção de serviço */}
                  {etapaAgendamento === "servico" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                          <Sparkles className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-white">
                          {clienteEncontrado
                            ? `Olá, ${clienteEncontrado?.nome || ""}!`
                            : `Olá, ${nomeNovoCliente}!`}
                        </h3>
                        <p className="text-gray-400">
                          Escolha o serviço desejado
                        </p>
                      </div>

                      <div className="mx-auto max-w-md space-y-4">
                        <div>
                          <Label className="text-white">Serviço</Label>
                          <select
                            value={servicoSelecionado}
                            onChange={(e) =>
                              setServicoSelecionado(e.target.value)
                            }
                            className="mt-2 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          >
                            <option value="">Selecione um serviço</option>
                            {servicosDisponiveis?.map((servico) => (
                              <option key={servico.nome} value={servico.nome}>
                                {servico.nome} - R$ {servico.preco} (
                                {servico.duracaoMinutos}min)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label className="text-white">Data desejada</Label>
                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setCalendarioAberto(!calendarioAberto)
                              }
                              className={`w-full justify-start border-gray-600 bg-gray-700 text-left font-normal text-white hover:bg-gray-600 ${
                                !dataAgendamento && "text-gray-400"
                              }`}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dataAgendamento ? (
                                dayjs(dataAgendamento)
                                  .locale("pt-br")
                                  .format("dddd, DD [de] MMMM [de] YYYY")
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                            </Button>

                            {calendarioAberto && (
                              <div className="mt-2 rounded-lg border border-gray-600 bg-gray-800 p-4 shadow-lg">
                                {/* Header do calendário */}
                                <div className="mb-4 flex items-center justify-between">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setMesAtual(mesAtual.subtract(1, "month"))
                                    }
                                    disabled={mesAtual
                                      .subtract(1, "month")
                                      .endOf("month")
                                      .isBefore(hoje, "day")}
                                    className="text-gray-300 hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <CalendarLeft className="h-4 w-4" />
                                  </Button>

                                  <h3 className="text-lg font-semibold text-white">
                                    {mesAtual
                                      .locale("pt-br")
                                      .format("MMMM [de] YYYY")}
                                  </h3>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setMesAtual(mesAtual.add(1, "month"))
                                    }
                                    disabled={mesAtual
                                      .add(1, "month")
                                      .startOf("month")
                                      .isAfter(dataMaxima, "day")}
                                    className="text-gray-300 hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <CalendarRight className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Dias da semana */}
                                <div className="mb-2 grid grid-cols-7 gap-1">
                                  {[
                                    "Dom",
                                    "Seg",
                                    "Ter",
                                    "Qua",
                                    "Qui",
                                    "Sex",
                                    "Sáb",
                                  ].map((dia) => (
                                    <div
                                      key={dia}
                                      className="p-2 text-center text-sm font-medium text-gray-400"
                                    >
                                      {dia}
                                    </div>
                                  ))}
                                </div>

                                {/* Dias do mês */}
                                <div className="grid grid-cols-7 gap-1">
                                  {(() => {
                                    const inicioMes = mesAtual.startOf("month");
                                    const fimMes = mesAtual.endOf("month");
                                    const inicioDomingo =
                                      inicioMes.startOf("week");
                                    const fimSabado = fimMes.endOf("week");

                                    const dias = [];
                                    let diaAtual = inicioDomingo;

                                    while (
                                      diaAtual.isBefore(fimSabado) ||
                                      diaAtual.isSame(fimSabado, "day")
                                    ) {
                                      const dia = diaAtual;
                                      const ehMesAtual = dia.isSame(
                                        mesAtual,
                                        "month",
                                      );
                                      const ehHoje = dia.isSame(hoje, "day");
                                      const ehPassado = dia.isBefore(
                                        hoje,
                                        "day",
                                      );
                                      const ehAlemDoLimite = dia.isAfter(
                                        dataMaxima,
                                        "day",
                                      );
                                      const ehSelecionado =
                                        dataAgendamento &&
                                        dia.isSame(
                                          dayjs(dataAgendamento),
                                          "day",
                                        );
                                      const ehDesabilitado =
                                        !ehMesAtual ||
                                        ehPassado ||
                                        ehAlemDoLimite;

                                      dias.push(
                                        <Button
                                          key={dia.format("YYYY-MM-DD")}
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          disabled={ehDesabilitado}
                                          onClick={() => {
                                            if (!ehDesabilitado) {
                                              setDataAgendamento(dia.toDate());
                                              setCalendarioAberto(false);
                                            }
                                          }}
                                          className={`h-10 w-10 p-0 text-sm transition-colors ${
                                            !ehMesAtual
                                              ? "cursor-not-allowed text-gray-600"
                                              : ""
                                          } ${
                                            ehPassado || ehAlemDoLimite
                                              ? "cursor-not-allowed text-gray-500 opacity-50"
                                              : ""
                                          } ${
                                            ehMesAtual &&
                                            !ehPassado &&
                                            !ehAlemDoLimite
                                              ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                                              : ""
                                          } ${
                                            ehHoje &&
                                            ehMesAtual &&
                                            !ehAlemDoLimite
                                              ? "bg-blue-600/20 font-semibold text-blue-400"
                                              : ""
                                          } ${
                                            ehSelecionado
                                              ? "bg-amber-500 font-semibold text-white hover:bg-amber-600"
                                              : ""
                                          } ${
                                            ehAlemDoLimite && ehMesAtual
                                              ? "cursor-not-allowed bg-red-500/10 text-red-400"
                                              : ""
                                          }`}
                                        >
                                          {dia.format("D")}
                                        </Button>,
                                      );

                                      diaAtual = diaAtual.add(1, "day");
                                    }

                                    return dias;
                                  })()}
                                </div>

                                {/* Footer com botões */}
                                <div className="mt-4 flex justify-between">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDataAgendamento(null);
                                      setCalendarioAberto(false);
                                    }}
                                    className="text-gray-400 hover:bg-gray-700 hover:text-white"
                                  >
                                    Limpar
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setMesAtual(dayjs());
                                      if (!dataAgendamento) {
                                        setDataAgendamento(new Date());
                                      }
                                    }}
                                    className="text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                                  >
                                    Hoje
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mensagem informativa sobre limite */}
                        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/10 p-3">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                            <p className="text-sm text-amber-300">
                              Agendamentos disponíveis até{" "}
                              {dataMaxima.format("DD/MM/YYYY")} (30 dias)
                            </p>
                          </div>
                        </div>

                        {dataAgendamento && servicoSelecionado && (
                          <div>
                            <Label className="text-white">
                              Horário desejado (opcional)
                            </Label>
                            <div className="relative mt-2">
                              <Input
                                type="text"
                                placeholder="14:30"
                                value={horarioManual}
                                onChange={(e) => {
                                  const valor = e.target.value.replace(
                                    /\D/g,
                                    "",
                                  );
                                  let valorFormatado = "";
                                  if (valor.length >= 1) {
                                    valorFormatado = valor.slice(0, 2);
                                    if (valor.length >= 3) {
                                      valorFormatado += ":" + valor.slice(2, 4);
                                    }
                                  }
                                  setHorarioManual(valorFormatado);

                                  // Validar horário
                                  if (valorFormatado.length === 5) {
                                    const [horas, minutos] = valorFormatado
                                      .split(":")
                                      .map(Number);
                                    const valido =
                                      typeof horas === "number" &&
                                      !isNaN(horas) &&
                                      typeof minutos === "number" &&
                                      !isNaN(minutos) &&
                                      horas >= 0 &&
                                      horas <= 23 &&
                                      minutos >= 0 &&
                                      minutos <= 59;
                                    setHorarioManualValido(valido);
                                  } else {
                                    setHorarioManualValido(false);
                                  }
                                }}
                                maxLength={5}
                                className="border-gray-600 bg-gray-700 pr-10 text-white"
                              />
                              <Clock className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            </div>

                            {horarioManual && horarioManualValido && (
                              <div className="mt-2">
                                {(() => {
                                  if (conflitoLoading) {
                                    return (
                                      <div className="flex items-center gap-2 text-amber-400">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">
                                          Verificando disponibilidade...
                                        </span>
                                      </div>
                                    );
                                  }

                                  if (conflito?.temConflito) {
                                    return (
                                      <div className="rounded-md border border-yellow-200 bg-yellow-50/10 p-3">
                                        <div className="flex items-start gap-2">
                                          <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-400" />
                                          <div>
                                            <p className="text-sm font-medium text-yellow-300">
                                              Horário {horarioManual} não
                                              disponível
                                            </p>
                                            {conflito.proximoDisponivel && (
                                              <div className="mt-2">
                                                <p className="text-sm text-yellow-200">
                                                  Próximo horário disponível:{" "}
                                                  {conflito.proximoDisponivel}
                                                </p>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() =>
                                                    setHorarioSelecionado(
                                                      conflito.proximoDisponivel!,
                                                    )
                                                  }
                                                  className="mt-2 border-yellow-400 text-yellow-300 hover:bg-yellow-400/10"
                                                >
                                                  Selecionar{" "}
                                                  {conflito.proximoDisponivel}
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (conflito && !conflito.temConflito) {
                                    return (
                                      <div className="rounded-md border border-green-200 bg-green-50/10 p-3">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="h-4 w-4 text-green-400" />
                                          <div>
                                            <p className="text-sm font-medium text-green-300">
                                              Horário {horarioManual}{" "}
                                              disponível!
                                            </p>
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                setHorarioSelecionado(
                                                  horarioManual,
                                                )
                                              }
                                              className="mt-2 bg-green-600 hover:bg-green-700"
                                            >
                                              Confirmar {horarioManual}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return null;
                                })()}
                              </div>
                            )}

                            {horarioManual &&
                              !horarioManualValido &&
                              horarioManual.length === 5 && (
                                <p className="mt-1 text-sm text-red-400">
                                  Horário inválido. Use o formato HH:MM
                                </p>
                              )}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() =>
                              setEtapaAgendamento(
                                clienteEncontrado ? "telefone" : "dados",
                              )
                            }
                            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Voltar
                          </Button>

                          {/* Se já tem horário selecionado, mostrar botão de confirmar */}
                          {horarioSelecionado ? (
                            <Button
                              onClick={confirmarAgendamento}
                              disabled={
                                !servicoSelecionado ||
                                !dataAgendamento ||
                                !horarioSelecionado ||
                                Boolean(criarAgendamentoMutation.isPending)
                              }
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            >
                              {criarAgendamentoMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Agendando...
                                </>
                              ) : (
                                `Confirmar às ${horarioSelecionado}`
                              )}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                if (servicoSelecionado && dataAgendamento) {
                                  setEtapaAgendamento("horario");
                                } else {
                                  alert("Selecione o serviço e a data");
                                }
                              }}
                              disabled={!servicoSelecionado || !dataAgendamento}
                              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            >
                              Ver Horários
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 4: Seleção de horário */}
                  {etapaAgendamento === "horario" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
                          <Clock className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="mb-2 text-2xl font-bold text-white">
                          Escolha o horário
                        </h3>
                        <p className="text-gray-400">
                          {servicoSelecionado} em{" "}
                          {dataAgendamento?.toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      <div className="mx-auto max-w-2xl space-y-4">
                        {carregandoHorarios ? (
                          <div className="flex items-center justify-center gap-2 py-8 text-amber-400">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>Carregando horários disponíveis...</span>
                          </div>
                        ) : horariosDisponiveis?.erro ? (
                          <div className="py-8 text-center">
                            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
                            <p className="text-red-400">
                              {horariosDisponiveis.erro}
                            </p>
                          </div>
                        ) : (
                          <>
                            {horariosDisponiveis?.intervalos &&
                              horariosDisponiveis.intervalos.length > 0 && (
                                <div className="mb-6 rounded-md border border-blue-200 bg-blue-50/10 p-4">
                                  <div className="mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-400" />
                                    <span className="text-sm font-medium text-blue-300">
                                      Funcionamento:
                                    </span>
                                  </div>
                                  <div className="text-sm text-blue-200">
                                    {horariosDisponiveis.intervalos.map(
                                      (intervalo, index) => (
                                        <span key={index}>
                                          {intervalo.inicio} às {intervalo.fim}
                                          {index <
                                            horariosDisponiveis.intervalos
                                              .length -
                                              1 && " • "}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}

                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                              {horariosDisponiveis?.horarios
                                ?.filter((h) => h.disponivel)
                                ?.slice(0, 18)
                                ?.map((horario) => (
                                  <Button
                                    key={horario.horario}
                                    variant={
                                      horarioSelecionado === horario.horario
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      setHorarioSelecionado(horario.horario)
                                    }
                                    className={`text-sm ${
                                      horarioSelecionado === horario.horario
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                        : "border-gray-600 text-gray-300 hover:bg-gray-700"
                                    }`}
                                  >
                                    {horario.horario}
                                  </Button>
                                ))}
                            </div>

                            {horariosDisponiveis?.horarios?.filter(
                              (h) => h.disponivel,
                            )?.length === 0 && (
                              <div className="py-8 text-center">
                                <CalendarDays className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                <p className="text-gray-400">
                                  Nenhum horário disponível para esta data
                                </p>
                                <p className="mt-2 text-sm text-gray-500">
                                  Tente escolher outra data
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        <div className="flex gap-3 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setEtapaAgendamento("servico")}
                            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Voltar
                          </Button>
                          <Button
                            onClick={confirmarAgendamento}
                            disabled={
                              !horarioSelecionado ||
                              Boolean(criarAgendamentoMutation.isPending)
                            }
                            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                          >
                            {criarAgendamentoMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Agendando...
                              </>
                            ) : (
                              "Confirmar Agendamento"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Etapa 5: Confirmação */
                <div className="space-y-6 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle className="h-12 w-12 text-green-400" />
                  </div>

                  <div>
                    <h3 className="mb-4 text-3xl font-bold text-white">
                      Agendamento Confirmado!
                    </h3>
                    <p className="mb-6 text-lg text-gray-300">
                      Seu agendamento foi realizado com sucesso
                    </p>
                  </div>

                  <div className="mx-auto max-w-md rounded-lg bg-gray-700/50 p-6">
                    <h4 className="mb-4 text-lg font-semibold text-white">
                      Detalhes do Agendamento
                    </h4>
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cliente:</span>
                        <span className="text-white">{nomeNovoCliente}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Telefone:</span>
                        <span className="text-white">
                          {telefoneAgendamento}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Serviço:</span>
                        <span className="text-white">{servicoSelecionado}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Data:</span>
                        <span className="text-white">
                          {dataAgendamento?.toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Horário:</span>
                        <span className="text-white">{horarioSelecionado}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-gray-400">
                      Entraremos em contato via WhatsApp para confirmar seu
                      agendamento
                    </p>

                    <Button
                      onClick={resetarAgendamento}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                      Fazer Novo Agendamento
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Carrossel de Parceiros */}
      {parcerias && parcerias.length > 0 && (
        <section id="parceiros" className="px-6 py-20">
          <div className="container mx-auto max-w-[90rem]">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold text-white">
                <Award className="mr-3 inline h-8 w-8 text-amber-400" />
                Nossos Parceiros
              </h2>
              <p className="text-lg text-gray-400">
                Parcerias que fortalecem nosso compromisso com a excelência
              </p>
            </div>

            {/* Carrossel com cards mais largos */}
            <div className="relative mx-auto w-full">
              <div className="flex items-center justify-center gap-8 overflow-hidden px-4">
                {/* Card Anterior (Esquerda) */}
                {parcerias.length > 1 && (
                  <div
                    className={`hidden w-[28%] cursor-pointer transition-all duration-300 ease-out lg:block ${
                      isTransitioning
                        ? "opacity-30"
                        : "opacity-60 hover:opacity-80"
                    }`}
                    onClick={() => goToSlide(getSlideIndex(-1))}
                  >
                    <div className="relative aspect-[16/9] transform overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02]">
                      {parcerias[getSlideIndex(-1)]?.imagem &&
                      parcerias[getSlideIndex(-1)]?.mimeType ? (
                        <Image
                          src={`data:${parcerias[getSlideIndex(-1)]?.mimeType};base64,${parcerias[getSlideIndex(-1)]?.imagem}`}
                          alt={parcerias[getSlideIndex(-1)]?.titulo ?? "Imagem"}
                          fill
                          className="object-cover transition-transform duration-300"
                          priority={true}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                          <Award className="h-12 w-12 text-amber-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute right-4 bottom-4 left-4">
                        <h4 className="truncate text-lg font-bold text-white">
                          {parcerias[getSlideIndex(-1)]?.titulo}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-300">
                          {parcerias[getSlideIndex(-1)]?.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Principal (Centro) */}
                <div
                  className={`w-full transition-all duration-400 ease-out lg:w-[44%] ${
                    isTransitioning ? "opacity-95" : "opacity-100"
                  }`}
                >
                  <div className="relative aspect-[16/10] transform overflow-hidden rounded-3xl shadow-2xl transition-all duration-400">
                    {parcerias[currentSlide]?.imagem &&
                    parcerias[currentSlide]?.mimeType ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={`data:${parcerias[currentSlide]?.mimeType};base64,${parcerias[currentSlide]?.imagem}`}
                          alt={
                            parcerias[currentSlide]?.titulo ||
                            "Imagem da parceria"
                          }
                          fill
                          className={`object-cover transition-all duration-400 ${
                            isTransitioning ? "scale-[1.01]" : "scale-100"
                          }`}
                          onError={(e) => {
                            console.error(
                              "Erro ao carregar imagem da parceria:",
                              parcerias[currentSlide]?.titulo,
                            );
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                          priority
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                        <Award className="h-16 w-16 text-amber-400" />
                      </div>
                    )}

                    {/* Overlay com informações */}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                      <div
                        className={`w-full p-6 text-white transition-all duration-400 lg:p-8 ${
                          isTransitioning
                            ? "translate-y-1 opacity-90"
                            : "translate-y-0 opacity-100"
                        }`}
                      >
                        <h3 className="mb-3 text-2xl leading-tight font-bold lg:text-3xl">
                          {parcerias[currentSlide]?.titulo}
                        </h3>
                        <p className="mb-4 line-clamp-2 text-base leading-relaxed text-gray-200 lg:mb-6 lg:text-lg">
                          {parcerias[currentSlide]?.descricao}
                        </p>
                        {parcerias[currentSlide]?.url && (
                          <a
                            href={parcerias[currentSlide]?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg lg:px-6 lg:py-3 lg:text-base"
                          >
                            Visitar Site
                            <ChevronRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Borda sutil para o card principal */}
                    <div className="absolute inset-0 rounded-3xl ring-1 ring-amber-500/20" />
                  </div>
                </div>

                {/* Card Posterior (Direita) */}
                {parcerias.length > 1 && (
                  <div
                    className={`hidden w-[28%] cursor-pointer transition-all duration-300 ease-out lg:block ${
                      isTransitioning
                        ? "opacity-30"
                        : "opacity-60 hover:opacity-80"
                    }`}
                    onClick={() => goToSlide(getSlideIndex(1))}
                  >
                    <div className="relative aspect-[16/9] transform overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02]">
                      {parcerias[getSlideIndex(1)]?.imagem &&
                      parcerias[getSlideIndex(1)]?.mimeType ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={`data:${parcerias[getSlideIndex(1)]?.mimeType};base64,${parcerias[getSlideIndex(1)]?.imagem}`}
                            alt={
                              parcerias[getSlideIndex(1)]?.titulo ??
                              "Imagem da parceria seguinte"
                            }
                            fill
                            className="object-cover transition-transform duration-300"
                            onError={(e) => {
                              console.error(
                                "Erro ao carregar imagem da parceria (seguinte):",
                                parcerias[getSlideIndex(1)]?.titulo,
                              );
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                          <Award className="h-12 w-12 text-amber-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute right-4 bottom-4 left-4">
                        <h4 className="truncate text-lg font-bold text-white">
                          {parcerias[getSlideIndex(1)]?.titulo}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-300">
                          {parcerias[getSlideIndex(1)]?.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navegação do carrossel */}
              {parcerias.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    disabled={isTransitioning}
                    className="absolute top-1/2 left-2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50 lg:left-4"
                    aria-label="Slide anterior"
                  >
                    <ChevronLeft className="h-5 w-5 lg:h-6 lg:w-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    disabled={isTransitioning}
                    className="absolute top-1/2 right-2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50 lg:right-4"
                    aria-label="Próximo slide"
                  >
                    <ChevronRight className="h-5 w-5 lg:h-6 lg:w-6" />
                  </button>

                  {/* Indicadores */}
                  <div className="mt-8 flex justify-center space-x-3">
                    {parcerias.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        disabled={isTransitioning}
                        className={`h-3 w-3 rounded-full transition-all duration-300 disabled:cursor-not-allowed ${
                          index === currentSlide
                            ? "scale-110 bg-amber-500 shadow-md shadow-amber-500/30"
                            : "bg-gray-400 hover:scale-105 hover:bg-gray-300"
                        }`}
                        aria-label={`Ir para slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Casos de Sucesso - Clientes */}
      <section id="clientes" className="bg-black/20 px-6 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white">
              <Users className="mr-3 inline h-8 w-8 text-amber-400" />
              Melhores clientes
            </h2>
            <p className="text-lg text-gray-400">
              Clientes que confiam no nosso trabalho
            </p>
          </div>

          {loadingClientes ? (
            <div className="text-center">
              <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent"></div>
              <p className="mt-4 text-gray-300">Carregando clientes...</p>
            </div>
          ) : errorClientes ? (
            <p className="text-center text-red-400">
              Erro ao carregar clientes.
            </p>
          ) : clientes && clientes.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {clientes.map((cliente) => (
                <Card
                  key={cliente.id}
                  className="group border-gray-700 bg-gray-800/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-gray-800/70"
                >
                  <CardContent className="p-8 text-center">
                    <div className="mb-6 flex justify-center">
                      {cliente.imagem && cliente.mimeType ? (
                        <div className="relative h-32 w-32">
                          <Image
                            src={`data:${cliente.mimeType};base64,${cliente.imagem}`}
                            alt={cliente.titulo || "Imagem do cliente"}
                            fill
                            className="rounded-full border-4 border-amber-500/30 object-cover transition-colors group-hover:border-amber-500/60"
                            onError={(e) => {
                              console.error(
                                "Erro ao carregar imagem do cliente:",
                                cliente.titulo,
                              );
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                          <Users className="h-12 w-12 text-amber-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="mb-3 text-2xl font-semibold text-white">
                      {cliente.titulo}
                    </h3>
                    <p className="mb-4 text-base text-gray-400">
                      {cliente.descricao}
                    </p>
                    <div className="flex justify-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-5 w-5 fill-current text-amber-400"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                <Users className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-gray-400">
                Em breve, casos de sucesso dos nossos clientes
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 px-6 py-8">
        <div className="container mx-auto max-w-6xl">
          <p className="text-center text-sm text-gray-400">
            © 2025 {configs?.nome}. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Modal de Login */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Entrar</h2>
              <button
                onClick={() => setShowLogin(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                Entrar
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-400">
              Não tem conta? Entre em contato conosco.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
