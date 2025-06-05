"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Eye,
  EyeOff,
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

  // Estados para login
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

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

  // Mutation para login
  const loginMutation = api.auth.login.useMutation({
    onSuccess: (data) => {
      // Armazenar token no localStorage
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_data", JSON.stringify(data.user));

      // Redirecionar para dashboard
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      setLoginError(error.message || "Erro ao fazer login");
    },
  });

  // Função para abrir links de parceiros
  const handleVisitarSite = (url: string) => {
    if (!url) return;
    window.open(url, "_blank"); // abre em nova aba
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginData.email || !loginData.password) {
      setLoginError("Por favor, preencha todos os campos");
      return;
    }

    loginMutation.mutate({
      email: loginData.email,
      password: loginData.password,
    });
  };

  const resetLoginForm = () => {
    setLoginData({ email: "", password: "" });
    setLoginError("");
    setShowPassword(false);
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
    const telefoneNumeros = limparTelefone(telefoneAgendamento);

    criarAgendamentoMutation.mutate({
      nome: nomeNovoCliente || "",
      telefone: telefoneNumeros,
      data: dataAgendamento?.toISOString().split("T")[0] ?? "",
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

  // Limpar erro de login quando modal fecha
  useEffect(() => {
    if (!showLogin) {
      resetLoginForm();
    }
  }, [showLogin]);

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
    <main className="bg-background min-h-screen">
      {/* Header/Navigation */}
      <header className="bg-muted/20 relative z-10 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-brand flex h-10 w-10 items-center justify-center rounded-full">
              <span className="text-lg font-bold text-white">D</span>
            </div>
            <span className="text-foreground text-xl font-bold">
              {configs?.nome}
            </span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#agendamento"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Agendar
            </a>
            <a
              href="#clientes"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Clientes
            </a>
            <a
              href="#parceiros"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Parceiros
            </a>

            <Button
              onClick={() => setShowLogin(true)}
              className="bg-gradient-brand hover:bg-gradient-brand-hover text-white"
            >
              Entrar
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20">
        <div className="from-brand-primary/10 to-brand-secondary/10 pointer-events-none absolute inset-0 bg-gradient-to-r" />
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="border-brand-primary/30 bg-brand-primary/10 text-brand-primary mb-6">
            <Sparkles className="mr-2 h-4 w-4" />
            Experiência Premium
          </Badge>

          <h1 className="text-foreground mb-6 text-5xl font-bold md:text-7xl">
            Estilo que
            <span className="from-brand-primary to-brand-accent bg-gradient-to-r bg-clip-text">
              {" "}
              Transforma
            </span>
          </h1>

          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
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
              className="bg-gradient-brand hover:bg-gradient-brand-hover cursor-pointer px-8 py-3 font-semibold text-white"
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
              className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Ver Parceiros
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-foreground text-3xl font-bold">500+</div>
              <div className="text-muted-foreground">Clientes Satisfeitos</div>
            </div>
            <div className="text-center">
              <div className="text-foreground text-3xl font-bold">5★</div>
              <div className="text-muted-foreground">Avaliação Média</div>
            </div>
            <div className="text-center">
              <div className="text-foreground text-3xl font-bold">3+</div>
              <div className="text-muted-foreground">Anos de Experiência</div>
            </div>
            <div className="text-center">
              <div className="text-foreground text-3xl font-bold">15+</div>
              <div className="text-muted-foreground">Serviços Oferecidos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Informações da Barbearia */}
      {configs && (
        <section className="px-6 py-16">
          <div className="container mx-auto max-w-4xl">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="bg-brand-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
                    <MapPin className="text-brand-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-card-foreground font-semibold">
                      Localização
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {configs.endereco || "Endereço não informado"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="bg-brand-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
                    <Phone className="text-brand-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-card-foreground font-semibold">
                      Contato
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {configs.telefone || "Telefone não informado"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="bg-brand-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
                    <Clock className="text-brand-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-card-foreground font-semibold">
                      Horário
                    </h3>
                    <p className="text-muted-foreground text-sm">
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
      <section id="agendamento" className="bg-muted/30 px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-foreground mb-4 text-4xl font-bold">
              <Calendar className="text-brand-primary mr-3 inline h-8 w-8" />
              Agende Seu Horário
            </h2>
            <p className="text-muted-foreground text-lg">
              Faça seu agendamento de forma rápida e prática
            </p>
          </div>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              {!agendamentoSucesso ? (
                <>
                  {/* Etapa 1: Telefone */}
                  {etapaAgendamento === "telefone" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="bg-brand-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                          <Phone className="text-brand-primary h-8 w-8" />
                        </div>
                        <h3 className="text-card-foreground mb-2 text-2xl font-bold">
                          Informe seu telefone
                        </h3>
                        <p className="text-muted-foreground">
                          Vamos verificar se você já é nosso cliente
                        </p>
                      </div>

                      <div className="mx-auto max-w-md space-y-4">
                        <div>
                          <Label
                            htmlFor="telefone"
                            className="text-card-foreground"
                          >
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
                            className="border-border bg-muted text-foreground mt-2"
                            maxLength={15}
                          />
                        </div>

                        {buscandoCliente && (
                          <div className="text-brand-primary flex items-center justify-center gap-2">
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
                          className="bg-gradient-brand hover:bg-gradient-brand-hover w-full text-white"
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
                        <div className="bg-brand-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                          <User className="text-brand-primary h-8 w-8" />
                        </div>
                        <h3 className="text-card-foreground mb-2 text-2xl font-bold">
                          Novo cliente
                        </h3>
                        <p className="text-muted-foreground">
                          Precisamos de algumas informações básicas
                        </p>
                      </div>

                      <div className="mx-auto max-w-md space-y-4">
                        <div>
                          <Label
                            htmlFor="nome"
                            className="text-card-foreground"
                          >
                            Nome completo
                          </Label>
                          <Input
                            id="nome"
                            type="text"
                            placeholder="Seu nome completo"
                            value={nomeNovoCliente}
                            onChange={(e) => setNomeNovoCliente(e.target.value)}
                            className="border-border bg-muted text-foreground mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-card-foreground">
                            Telefone
                          </Label>
                          <Input
                            value={telefoneAgendamento}
                            disabled
                            className="border-border bg-muted/50 text-muted-foreground mt-2"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setEtapaAgendamento("telefone")}
                            className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground flex-1"
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
                            className="bg-gradient-brand hover:bg-gradient-brand-hover flex-1 text-white"
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
                        <div className="bg-brand-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                          <Sparkles className="text-brand-primary h-8 w-8" />
                        </div>
                        <h3 className="text-card-foreground mb-2 text-2xl font-bold">
                          {clienteEncontrado
                            ? `Olá, ${clienteEncontrado?.nome || ""}!`
                            : `Olá, ${nomeNovoCliente}!`}
                        </h3>
                        <p className="text-muted-foreground">
                          Escolha o serviço desejado
                        </p>
                      </div>

                      <div className="mx-auto max-w-md space-y-4">
                        <div>
                          <Label className="text-card-foreground">
                            Serviço
                          </Label>
                          <select
                            value={servicoSelecionado}
                            onChange={(e) =>
                              setServicoSelecionado(e.target.value)
                            }
                            className="border-border bg-muted text-foreground focus:ring-brand-primary mt-2 w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
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
                          <Label className="text-card-foreground">
                            Data desejada
                          </Label>
                          <div className="mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setCalendarioAberto(!calendarioAberto)
                              }
                              className={`border-border bg-muted text-foreground hover:bg-accent hover:text-accent-foreground w-full justify-start text-left font-normal ${
                                !dataAgendamento && "text-muted-foreground"
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
                              <div className="border-border bg-card mt-2 rounded-lg border p-4 shadow-lg">
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
                                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <CalendarLeft className="h-4 w-4" />
                                  </Button>

                                  <h3 className="text-card-foreground text-lg font-semibold">
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
                                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                                      className="text-muted-foreground p-2 text-center text-sm font-medium"
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
                                              ? "text-muted-foreground/50 cursor-not-allowed"
                                              : ""
                                          } ${
                                            ehPassado || ehAlemDoLimite
                                              ? "text-muted-foreground/50 cursor-not-allowed opacity-50"
                                              : ""
                                          } ${
                                            ehMesAtual &&
                                            !ehPassado &&
                                            !ehAlemDoLimite
                                              ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                              : ""
                                          } ${
                                            ehHoje &&
                                            ehMesAtual &&
                                            !ehAlemDoLimite
                                              ? "bg-info/20 text-info font-semibold"
                                              : ""
                                          } ${
                                            ehSelecionado
                                              ? "bg-brand-primary hover:bg-brand-accent font-semibold text-white"
                                              : ""
                                          } ${
                                            ehAlemDoLimite && ehMesAtual
                                              ? "bg-error/10 text-error cursor-not-allowed"
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
                                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                                    className="text-brand-primary hover:bg-brand-primary/20 hover:text-brand-accent"
                                  >
                                    Hoje
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mensagem informativa sobre limite */}
                        <div className="border-warning bg-warning/10 mt-4 rounded-md border p-3">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-warning h-4 w-4" />
                            <p className="text-warning text-sm">
                              Agendamentos disponíveis até{" "}
                              {dataMaxima.format("DD/MM/YYYY")} (30 dias)
                            </p>
                          </div>
                        </div>

                        {dataAgendamento && servicoSelecionado && (
                          <div>
                            <Label className="text-card-foreground">
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
                                className="border-border bg-muted text-foreground pr-10"
                              />
                              <Clock className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
                            </div>

                            {horarioManual && horarioManualValido && (
                              <div className="mt-2">
                                {(() => {
                                  if (conflitoLoading) {
                                    return (
                                      <div className="text-brand-primary flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">
                                          Verificando disponibilidade...
                                        </span>
                                      </div>
                                    );
                                  }

                                  if (conflito?.temConflito) {
                                    return (
                                      <div className="border-warning bg-warning/10 rounded-md border p-3">
                                        <div className="flex items-start gap-2">
                                          <AlertCircle className="text-warning mt-0.5 h-4 w-4" />
                                          <div>
                                            <p className="text-warning text-sm font-medium">
                                              Horário {horarioManual} não
                                              disponível
                                            </p>
                                            {conflito.proximoDisponivel && (
                                              <div className="mt-2">
                                                <p className="text-warning/80 text-sm">
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
                                                  className="border-warning text-warning hover:bg-warning/10 mt-2"
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
                                      <div className="border-success bg-success/10 rounded-md border p-3">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="text-success h-4 w-4" />
                                          <div>
                                            <p className="text-success text-sm font-medium">
                                              Horário {horarioManual} disponível
                                            </p>
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                setHorarioSelecionado(
                                                  horarioManual,
                                                );
                                                // aguarda o estado atualizar e chama a função
                                                setTimeout(() => {
                                                  confirmarAgendamento();
                                                }, 0);
                                              }}
                                              className="bg-success hover:bg-success/80 text-success-foreground mt-2"
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
                                <p className="text-error mt-1 text-sm">
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
                            className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground flex-1"
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
                              className="bg-success hover:bg-success/80 text-success-foreground flex-1"
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
                              className="bg-gradient-brand hover:bg-gradient-brand-hover flex-1 text-white"
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
                        <div className="bg-brand-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                          <Clock className="text-brand-primary h-8 w-8" />
                        </div>
                        <h3 className="text-card-foreground mb-2 text-2xl font-bold">
                          Escolha o horário
                        </h3>
                        <p className="text-muted-foreground">
                          {servicoSelecionado} em{" "}
                          {dataAgendamento?.toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      <div className="mx-auto max-w-2xl space-y-4">
                        {carregandoHorarios ? (
                          <div className="text-brand-primary flex items-center justify-center gap-2 py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>Carregando horários disponíveis...</span>
                          </div>
                        ) : horariosDisponiveis?.erro ? (
                          <div className="py-8 text-center">
                            <AlertCircle className="text-error mx-auto mb-4 h-12 w-12" />
                            <p className="text-error">
                              {horariosDisponiveis.erro}
                            </p>
                          </div>
                        ) : (
                          <>
                            {horariosDisponiveis?.intervalos &&
                              horariosDisponiveis.intervalos.length > 0 && (
                                <div className="border-info bg-info/10 mb-6 rounded-md border p-4">
                                  <div className="mb-2 flex items-center gap-2">
                                    <Clock className="text-info h-4 w-4" />
                                    <span className="text-info text-sm font-medium">
                                      Funcionamento:
                                    </span>
                                  </div>
                                  <div className="text-info/80 text-sm">
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
                                        ? "bg-gradient-brand hover:bg-gradient-brand-hover text-white"
                                        : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                                <CalendarDays className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                <p className="text-muted-foreground">
                                  Nenhum horário disponível para esta data
                                </p>
                                <p className="text-muted-foreground/70 mt-2 text-sm">
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
                            className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground flex-1"
                          >
                            Voltar
                          </Button>
                          <Button
                            onClick={confirmarAgendamento}
                            disabled={
                              !horarioSelecionado ||
                              Boolean(criarAgendamentoMutation.isPending)
                            }
                            className="bg-gradient-brand hover:bg-gradient-brand-hover flex-1 text-white"
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
                  <div className="bg-success/20 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                    <CheckCircle className="text-success h-12 w-12" />
                  </div>

                  <div>
                    <h3 className="text-card-foreground mb-4 text-3xl font-bold">
                      Agendamento Confirmado!
                    </h3>
                    <p className="text-muted-foreground mb-6 text-lg">
                      Seu agendamento foi realizado com sucesso
                    </p>
                  </div>

                  <div className="bg-muted/50 mx-auto max-w-md rounded-lg p-6">
                    <h4 className="text-card-foreground mb-4 text-lg font-semibold">
                      Detalhes do Agendamento
                    </h4>
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="text-card-foreground">
                          {nomeNovoCliente}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Telefone:</span>
                        <span className="text-card-foreground">
                          {telefoneAgendamento}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Serviço:</span>
                        <span className="text-card-foreground">
                          {servicoSelecionado}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data:</span>
                        <span className="text-card-foreground">
                          {dataAgendamento?.toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Horário:</span>
                        <span className="text-card-foreground">
                          {horarioSelecionado}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      Entraremos em contato via WhatsApp para confirmar seu
                      agendamento
                    </p>

                    <Button
                      onClick={resetarAgendamento}
                      className="bg-gradient-brand hover:bg-gradient-brand-hover text-white"
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
              <h2 className="text-foreground mb-4 text-4xl font-bold">
                <Award className="text-brand-primary mr-3 inline h-8 w-8" />
                Nossos Parceiros
              </h2>
              <p className="text-muted-foreground text-lg">
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
                        <div className="from-brand-primary/20 to-brand-secondary/20 flex h-full w-full items-center justify-center bg-gradient-to-br">
                          <Award className="text-brand-primary h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute right-4 bottom-4 left-4">
                        <h4 className="truncate text-lg font-bold text-white">
                          {parcerias[getSlideIndex(-1)]?.titulo}
                        </h4>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
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
                      <div className="from-brand-primary/20 to-brand-secondary/20 flex h-full w-full items-center justify-center bg-gradient-to-br">
                        <Award className="text-brand-primary h-16 w-16" />
                      </div>
                    )}

                    {/* Overlay com informações */}
                    <div className="absolute inset-0 z-10 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
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
                        <p className="text-muted-foreground mb-4 line-clamp-2 text-base leading-relaxed lg:mb-6 lg:text-lg">
                          {parcerias[currentSlide]?.descricao}
                        </p>
                        {parcerias[currentSlide]?.url && (
                          <Button
                            onClick={() =>
                              handleVisitarSite(
                                parcerias[currentSlide]?.url ?? "",
                              )
                            }
                            className="bg-gradient-brand hover:bg-gradient-brand-hover z-50 inline-flex cursor-pointer items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg lg:px-6 lg:py-3 lg:text-base"
                          >
                            Visitar Site
                            <ChevronRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Borda sutil para o card principal */}
                    <div className="border-brand-primary/20 absolute inset-0 rounded-3xl ring-1" />
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
                        <div className="from-brand-primary/20 to-brand-secondary/20 flex h-full w-full items-center justify-center bg-gradient-to-br">
                          <Award className="text-brand-primary h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute right-4 bottom-4 left-4">
                        <h4 className="truncate text-lg font-bold text-white">
                          {parcerias[getSlideIndex(1)]?.titulo}
                        </h4>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
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
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Casos de Sucesso - Clientes */}
      <section id="clientes" className="bg-muted/20 px-6 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-foreground mb-4 text-4xl font-bold">
              <Users className="text-brand-primary mr-3 inline h-8 w-8" />
              Melhores clientes
            </h2>
            <p className="text-muted-foreground text-lg">
              Clientes que confiam no nosso trabalho
            </p>
          </div>

          {loadingClientes ? (
            <div className="text-center">
              <div className="border-brand-primary inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-r-transparent"></div>
              <p className="text-muted-foreground mt-4">
                Carregando clientes...
              </p>
            </div>
          ) : errorClientes ? (
            <p className="text-error text-center">Erro ao carregar clientes.</p>
          ) : clientes && clientes.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {clientes.map((cliente) => (
                <Card
                  key={cliente.id}
                  className="group border-border bg-card/50 hover:bg-card/70 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                >
                  <CardContent className="p-8 text-center">
                    <div className="mb-6 flex justify-center">
                      {cliente.imagem && cliente.mimeType ? (
                        <div className="relative h-32 w-32">
                          <Image
                            src={`data:${cliente.mimeType};base64,${cliente.imagem}`}
                            alt={cliente.titulo || "Imagem do cliente"}
                            fill
                            className="border-brand-primary/30 group-hover:border-brand-primary/60 rounded-full border-4 object-cover transition-colors"
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
                        <div className="from-brand-primary/20 to-brand-secondary/20 border-brand-primary/30 flex h-32 w-32 items-center justify-center rounded-full border-4 bg-gradient-to-br">
                          <Users className="text-brand-primary h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-card-foreground mb-3 text-2xl font-semibold">
                      {cliente.titulo}
                    </h3>
                    <p className="text-muted-foreground mb-4 text-base">
                      {cliente.descricao}
                    </p>
                    <div className="flex justify-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="text-brand-primary h-5 w-5 fill-current"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-card mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Users className="text-muted-foreground h-8 w-8" />
              </div>
              <p className="text-muted-foreground">
                Em breve, casos de sucesso dos nossos clientes
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/40 px-6 py-8">
        <div className="container mx-auto max-w-6xl">
          <p className="text-muted-foreground text-center text-sm">
            © 2025 {configs?.nome}. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Modal de Login */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="border-border bg-card mx-4 w-full max-w-md rounded-xl border p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-card-foreground text-2xl font-bold">
                Entrar
              </h2>
              <button
                onClick={() => setShowLogin(false)}
                className="text-muted-foreground hover:text-foreground text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            {loginError && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {loginError}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label
                  htmlFor="email"
                  className="text-muted-foreground mb-2 block text-sm font-medium"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                  className="border-border bg-muted text-foreground focus:ring-brand-primary w-full"
                  placeholder="seu@email.com"
                  disabled={loginMutation.isPending}
                />
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="text-muted-foreground mb-2 block text-sm font-medium"
                >
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    className="border-border bg-muted text-foreground focus:ring-brand-primary w-full pr-10"
                    placeholder="••••••••"
                    disabled={loginMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                    disabled={loginMutation.isPending}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="bg-gradient-brand hover:bg-gradient-brand-hover w-full text-white"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <p className="text-muted-foreground mt-4 text-center text-sm">
              Não tem conta? Entre em contato conosco.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
