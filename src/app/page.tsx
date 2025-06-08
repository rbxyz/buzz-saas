"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronRight,
  MapPin,
  Phone,
  Clock,
  Award,
  Sparkles,
  Calendar,
  Loader2,
  CheckCircle,
  User,
  CalendarDays,
  Menu,
  ChevronLeft,
  Users,
  Star,
  AlertCircle,
  EyeOff,
  Eye,
  MessageCircle,
  Send,
  XCircle,
  Info,
} from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import Image from "next/image";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import {
  LayoutPanelLeftIcon as CalendarLeft,
  PanelRightIcon as CalendarRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [whatsappStatus, setWhatsappStatus] = useState<{
    enviado: boolean;
    erro?: string;
  }>({ enviado: false });

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

  // Função para adicionar prefixo 55 ao telefone
  const adicionarPrefixo55 = (telefone: string): string => {
    // Remove todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, "");

    // Se já começa com 55, retorna o número limpo
    if (numeroLimpo.startsWith("55")) {
      return numeroLimpo;
    }

    // Adiciona o prefixo 55
    return `55${numeroLimpo}`;
  };

  const { data: clientePorTelefone, isLoading: buscandoCliente } =
    api.cliente.buscarPorTelefone.useQuery(
      {
        // Adiciona prefixo 55 ao telefone para busca
        telefone: adicionarPrefixo55(telefoneAgendamento),
      },
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
      onSuccess: (data) => {
        console.log("✅ [AGENDAMENTO] Sucesso:", data);
        setAgendamentoSucesso(true);
        setEtapaAgendamento("confirmacao");
        // Atualizar status do WhatsApp
        setWhatsappStatus({
          enviado: data.whatsappEnviado || false,
          erro: data.whatsappError ?? undefined,
        });
      },
      onError: (error) => {
        console.error("❌ [AGENDAMENTO] Erro:", error);
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
    setWhatsappStatus({ enviado: false });
  };

  const confirmarAgendamento = () => {
    // Adiciona prefixo 55 ao telefone para o agendamento
    const telefoneNumeros = adicionarPrefixo55(
      limparTelefone(telefoneAgendamento),
    );

    // Validar que temos um horário selecionado
    if (!horarioSelecionado || horarioSelecionado.trim() === "") {
      alert(
        "Por favor, selecione um horário válido antes de confirmar o agendamento",
      );
      return;
    }

    // Validar dados obrigatórios
    if (!nomeNovoCliente || !dataAgendamento || !servicoSelecionado) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    console.log("📋 [AGENDAMENTO] Confirmando agendamento:", {
      nome: nomeNovoCliente,
      telefone: telefoneNumeros,
      data: dataAgendamento?.toISOString().split("T")[0],
      horario: horarioSelecionado,
      servico: servicoSelecionado,
    });

    criarAgendamentoMutation.mutate({
      nome: nomeNovoCliente,
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
            <div className="bg-gradient-brand flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
              <Image
                src={"/favicon.png"}
                alt="Logo"
                width={20}
                height={20}
                className="object-cover"
              />
            </div>
            <span className="text-foreground text-xl font-bold">
              {configs?.nome}
            </span>
          </div>

          {/* Menu para desktop */}
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
              className="bg-gradient-brand hover:bg-gradient-brand-hover cursor-pointer text-white"
            >
              Entrar
            </Button>
          </nav>

          {/* Botão hambúrguer para mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLogin(true)}
            className="md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20">
        {/* Imagem de fundo absoluta */}
        <Image
          src="/bg.webp"
          alt="Background Header"
          fill
          className="object-cover brightness-75"
        />

        {/* Gradiente por cima da imagem */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-black/80 via-transparent to-black/60" />

        <div className="relative z-10 container mx-auto max-w-6xl text-center">
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

          <p className="mx-auto mb-8 max-w-2xl rounded-xl bg-black/40 px-4 py-2 text-xl text-white shadow-lg backdrop-blur-sm">
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
              className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
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
            {configs?.telefone && (
              <div className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4" />
                <span>
                  Ou converse conosco pelo WhatsApp: {configs.telefone}
                </span>
              </div>
            )}

            {/* Status do WhatsApp */}
            {configs && (
              <div className="mt-2 flex items-center justify-center gap-2">
                {configs.whatsappAtivo ? (
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-700"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    WhatsApp Ativo
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-orange-500 text-orange-700"
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    WhatsApp Inativo
                  </Badge>
                )}
              </div>
            )}
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
                          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                            <Info className="h-3 w-3" />
                            <span>
                              O código do país (55) será adicionado
                              automaticamente
                            </span>
                          </div>
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
                          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                            <Info className="h-3 w-3" />
                            <span>
                              O código do país (55) será adicionado
                              automaticamente
                            </span>
                          </div>
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
                                                setTimeout(() => {
                                                  confirmarAgendamento();
                                                }, 100);
                                              }}
                                              className="bg-success text-success-foreground hover:bg-success/80 mt-2"
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
                                criarAgendamentoMutation.isPending
                              }
                              className="bg-success text-success-foreground hover:bg-success/80 flex-1"
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
                              criarAgendamentoMutation.isPending
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

                  {/* Status do WhatsApp */}
                  <div className="space-y-3">
                    {whatsappStatus.enviado ? (
                      <div className="border-success bg-success/10 mx-auto max-w-md rounded-md border p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-success/20 flex h-10 w-10 items-center justify-center rounded-full">
                            <Send className="text-success h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-success text-sm font-medium">
                              Confirmação enviada via WhatsApp!
                            </p>
                            <p className="text-success/80 text-xs">
                              Você receberá uma mensagem com todos os detalhes
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-warning bg-warning/10 mx-auto max-w-md rounded-md border p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-warning/20 flex h-10 w-10 items-center justify-center rounded-full">
                            <MessageCircle className="text-warning h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-warning text-sm font-medium">
                              {whatsappStatus.erro
                                ? "Erro ao enviar WhatsApp"
                                : "Entraremos em contato via WhatsApp"}
                            </p>
                            <p className="text-warning/80 text-xs">
                              {whatsappStatus.erro
                                ? `Erro: ${whatsappStatus.erro}`
                                : "Para confirmar seu agendamento"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-muted-foreground text-sm">
                      Nosso agente inteligente também pode ajudar você pelo
                      WhatsApp com reagendamentos, cancelamentos e outras
                      dúvidas!
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Principal (Centro) */}
                <div
                  className={`w-full transition-all duration-300 ease-out lg:w-[40%] ${
                    isTransitioning ? "scale-95 opacity-70" : "scale-100"
                  }`}
                >
                  <Card className="border-border bg-card/80 group hover:shadow-3xl relative overflow-hidden rounded-3xl shadow-2xl backdrop-blur-sm transition-all duration-300">
                    <div className="relative aspect-[16/9] overflow-hidden">
                      {parcerias[currentSlide]?.imagem &&
                      parcerias[currentSlide]?.mimeType ? (
                        <Image
                          src={`data:${parcerias[currentSlide]?.mimeType};base64,${parcerias[currentSlide]?.imagem}`}
                          alt={parcerias[currentSlide]?.titulo ?? "Imagem"}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          priority={true}
                        />
                      ) : (
                        <div className="from-brand-primary/30 to-brand-secondary/30 flex h-full w-full items-center justify-center bg-gradient-to-br">
                          <Award className="text-brand-primary h-16 w-16" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>

                    <CardContent className="absolute right-6 bottom-6 left-6 p-0">
                      <div className="space-y-4">
                        <div>
                          <h3 className="mb-2 text-2xl font-bold text-white">
                            {parcerias[currentSlide]?.titulo}
                          </h3>
                          {parcerias[currentSlide]?.descricao && (
                            <p className="line-clamp-3 text-white/90">
                              {parcerias[currentSlide]?.descricao}
                            </p>
                          )}
                        </div>

                        {parcerias[currentSlide]?.url && (
                          <Button
                            onClick={() =>
                              handleVisitarSite(
                                parcerias[currentSlide]?.url ?? "",
                              )
                            }
                            className="bg-gradient-brand hover:bg-gradient-brand-hover cursor-pointer text-white shadow-lg transition-all duration-300 hover:shadow-xl"
                          >
                            Visitar Site
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Card Próximo (Direita) */}
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
                        <Image
                          src={`data:${parcerias[getSlideIndex(1)]?.mimeType};base64,${parcerias[getSlideIndex(1)]?.imagem}`}
                          alt={parcerias[getSlideIndex(1)]?.titulo ?? "Imagem"}
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
                          {parcerias[getSlideIndex(1)]?.titulo}
                        </h4>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controles de navegação */}
              {parcerias.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prevSlide}
                    disabled={isTransitioning}
                    className="border-border bg-card/80 text-muted-foreground hover:bg-accent hover:text-accent-foreground absolute top-1/2 left-4 z-10 h-12 w-12 -translate-y-1/2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl disabled:opacity-50 lg:left-8"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextSlide}
                    disabled={isTransitioning}
                    className="border-border bg-card/80 text-muted-foreground hover:bg-accent hover:text-accent-foreground absolute top-1/2 right-4 z-10 h-12 w-12 -translate-y-1/2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl disabled:opacity-50 lg:right-8"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Indicadores */}
              {parcerias.length > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {parcerias.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      disabled={isTransitioning}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentSlide
                          ? "bg-brand-primary w-8"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                      } ${isTransitioning ? "opacity-50" : ""}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Seção de Clientes */}
      {clientes && clientes.length > 0 && (
        <section id="clientes" className="bg-muted/30 px-6 py-20">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="text-foreground mb-4 text-4xl font-bold">
                <Users className="text-brand-primary mr-3 inline h-8 w-8" />
                Nossos Clientes
              </h2>
              <p className="text-muted-foreground text-lg">
                Conheça alguns dos nossos clientes satisfeitos
              </p>
            </div>

            {loadingClientes ? (
              <div className="text-brand-primary flex items-center justify-center gap-2 py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Carregando clientes...</span>
              </div>
            ) : errorClientes ? (
              <div className="py-12 text-center">
                <AlertCircle className="text-error mx-auto mb-4 h-12 w-12" />
                <p className="text-error">Erro ao carregar clientes</p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {clientes.slice(0, 6).map((cliente) => (
                  <Card
                    key={cliente.id}
                    className="border-border bg-card/50 group overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {cliente.imagem && cliente.mimeType ? (
                        <Image
                          src={`data:${cliente.mimeType};base64,${cliente.imagem}`}
                          alt={cliente.titulo ?? "Cliente"}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="from-brand-primary/20 to-brand-secondary/20 flex h-full w-full items-center justify-center bg-gradient-to-br">
                          <User className="text-brand-primary h-16 w-16" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <h3 className="text-card-foreground text-xl font-bold">
                          {cliente.titulo}
                        </h3>
                        {cliente.descricao && (
                          <p className="text-muted-foreground line-clamp-3 text-sm">
                            {cliente.descricao}
                          </p>
                        )}
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-current text-yellow-400"
                            />
                          ))}
                        </div>
                        {cliente.url && (
                          <Button
                            onClick={() => handleVisitarSite(cliente.url ?? "")}
                            variant="outline"
                            size="sm"
                            className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full"
                          >
                            Ver Perfil
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-muted/50 px-6 py-12">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="bg-gradient-brand flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
              <Image
                src={"/favicon.png"}
                alt="Logo"
                width={24}
                height={24}
                className="object-cover"
              />
            </div>
            <span className="text-foreground text-2xl font-bold">
              {configs?.nome}
            </span>
          </div>

          <p className="text-muted-foreground mb-8">
            Transformando estilo em experiência. Sua satisfação é nossa
            prioridade.
          </p>

          <div className="border-border mb-8 border-t pt-8">
            <p className="text-muted-foreground/70 text-sm">
              © 2024 {configs?.nome}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Login */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="mb-6 text-center">
                <h2 className="text-card-foreground mb-2 text-2xl font-bold">
                  Entrar no Sistema
                </h2>
                <p className="text-muted-foreground">
                  Acesse o painel administrativo
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-card-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    className="border-border bg-muted text-foreground mt-2"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-card-foreground">
                    Senha
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      className="border-border bg-muted text-foreground pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-0 right-0 h-full px-3"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {loginError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLogin(false)}
                    className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="bg-gradient-brand hover:bg-gradient-brand-hover flex-1 text-white"
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
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
