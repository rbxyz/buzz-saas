"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarIcon,
  User,
  Phone,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Configurar dayjs para português
dayjs.locale("pt-br");

// Função para aplicar máscara de horário
const aplicarMascaraHorario = (valor: string): string => {
  const numeros = valor.replace(/\D/g, "");
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

// Função para converter dia da semana
const getDiaSemana = (date: Date): string => {
  const dias = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ];
  return dias[date.getDay()]!;
};

// Função CORRIGIDA para verificar se horário está dentro dos intervalos de trabalho
const verificarHorarioNoIntervalo = (
  horario: string,
  intervalos: any[],
  data: Date,
  duracaoServico = 30,
): { valido: boolean; mensagem?: string } => {
  console.log("🕐 Verificando horário no intervalo:", {
    horario,
    duracaoServico,
    data: format(data, "yyyy-MM-dd"),
    intervalos: intervalos?.length || 0,
  });

  if (!intervalos || intervalos.length === 0) {
    console.log("❌ Nenhum intervalo de trabalho encontrado");
    return { valido: false, mensagem: "Estabelecimento fechado neste dia" };
  }

  const diaSemana = getDiaSemana(data);
  const intervalosAtivos = intervalos.filter(
    (i) => i.diaSemana === diaSemana && i.ativo,
  );

  console.log("📅 Intervalos para", diaSemana, ":", intervalosAtivos);

  if (intervalosAtivos.length === 0) {
    console.log("❌ Estabelecimento fechado no dia:", diaSemana);
    return { valido: false, mensagem: "Estabelecimento fechado neste dia" };
  }

  const [hora, minuto] = horario.split(":").map(Number);
  const horarioMinutos = hora! * 60 + minuto!;
  const fimServicoMinutos = horarioMinutos + duracaoServico;

  console.log("⏰ Cálculo de horários:", {
    horarioInicio: `${hora}:${minuto}`,
    horarioInicioMinutos: horarioMinutos,
    fimServicoMinutos,
    duracaoServico,
  });

  for (const intervalo of intervalosAtivos) {
    const [horaInicio, minutoInicio] = intervalo.horaInicio
      .split(":")
      .map(Number);
    const [horaFim, minutoFim] = intervalo.horaFim.split(":").map(Number);

    const inicioMinutos = horaInicio! * 60 + minutoInicio!;
    const fimMinutos = horaFim! * 60 + minutoFim!;

    console.log("🏢 Verificando intervalo:", {
      intervalo: `${intervalo.horaInicio} às ${intervalo.horaFim}`,
      inicioMinutos,
      fimMinutos,
      servicoCabeNoIntervalo:
        horarioMinutos >= inicioMinutos && fimServicoMinutos <= fimMinutos,
    });

    // CORREÇÃO CRÍTICA: Verificar se o serviço TERMINA antes do fim do funcionamento
    if (horarioMinutos >= inicioMinutos && fimServicoMinutos <= fimMinutos) {
      console.log("✅ Horário válido dentro do intervalo de funcionamento");
      return { valido: true };
    }
  }

  const horariosDisponiveis = intervalosAtivos
    .map((i) => `${i.horaInicio} às ${i.horaFim}`)
    .join(", ");
  const mensagem = `Horário fora do funcionamento. O serviço deve terminar antes do fechamento. Horários: ${horariosDisponiveis}`;

  console.log("❌ Horário inválido:", mensagem);
  return { valido: false, mensagem };
};

interface FormularioAgendamentoProps {
  modo?: "admin" | "publico";
}

export default function FormularioAgendamento({
  modo = "admin",
}: FormularioAgendamentoProps) {
  const [step, setStep] = useState(1);
  const [clienteExistente, setClienteExistente] = useState<any>(null);
  const [horario, setHorario] = useState<string>("");
  const [horarioInput, setHorarioInput] = useState<string>("");
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    data: undefined as Date | undefined,
    servicoId: "",
  });

  // Queries
  const { data: servicos } = api.configuracao.getServicos.useQuery();
  const { data: intervalosTrabalho } = api.intervaloTrabalho.listar.useQuery();

  // Verificar conflito quando horário específico for selecionado
  const { data: conflito } = api.agendamento.verificarConflito.useQuery(
    {
      data: formData.data ? format(formData.data, "yyyy-MM-dd") : "",
      horario: horario,
      servico: formData.servicoId,
    },
    {
      enabled:
        !!horario &&
        !!formData.servicoId &&
        !!formData.data &&
        validarHorario(horario),
      refetchOnWindowFocus: false,
    },
  );

  // Mutation para criar agendamento
  const createMutation = api.agendamento.create.useMutation({
    onSuccess: () => {
      console.log("✅ Agendamento criado com sucesso");
      toast({
        title: "Agendamento criado!",
        description: "Agendamento realizado com sucesso.",
      });
      setStep(3);
    },
    onError: (error) => {
      console.error("❌ Erro ao criar agendamento:", error);
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para criar cliente
  const criarClienteMutation = api.cliente.criar.useMutation({
    onSuccess: (novoCliente) => {
      console.log("✅ Cliente criado com sucesso:", novoCliente);
      setClienteExistente(novoCliente);
      toast({
        title: "Cliente cadastrado!",
        description: "Novo cliente criado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("❌ Erro ao criar cliente:", error);
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
  };

  const handleTelefoneChange = (value: string) => {
    const telefoneFormatado = formatTelefone(value);
    setFormData({ ...formData, telefone: telefoneFormatado });
    setClienteExistente(null);
  };

  // IMPLEMENTAÇÃO CRÍTICA: buscarClientePorTelefone
  const buscarClientePorTelefone = async (telefoneNumeros: string) => {
    console.log(
      "🔍 Frontend: Iniciando busca de cliente por telefone:",
      telefoneNumeros,
    );

    try {
      const resultado = await api.cliente.buscarPorTelefone.query({
        telefone: telefoneNumeros,
      });

      if (resultado) {
        console.log("✅ Frontend: Cliente encontrado:", {
          id: resultado.id,
          nome: resultado.nome,
          telefone: resultado.telefone,
          email: resultado.email,
        });
        return resultado;
      } else {
        console.log(
          "ℹ️ Frontend: Cliente não encontrado para telefone:",
          telefoneNumeros,
        );
        return null;
      }
    } catch (error) {
      console.error("❌ Frontend: Erro na busca de cliente:", error);
      return null;
    }
  };

  // Função para verificar cliente ao avançar
  const verificarClienteEAvancar = async () => {
    const telefoneNumeros = formData.telefone.replace(/\D/g, "");

    console.log("📋 Validando dados antes de avançar:", {
      nome: formData.nome,
      telefoneNumeros,
      telefoneLength: telefoneNumeros.length,
    });

    if (!formData.nome || telefoneNumeros.length < 10) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e telefone corretamente.",
        variant: "destructive",
      });
      return;
    }

    // EXECUÇÃO OBRIGATÓRIA: Buscar cliente existente
    console.log("🔍 Executando busca obrigatória de cliente...");
    const clienteEncontrado = await buscarClientePorTelefone(telefoneNumeros);

    if (clienteEncontrado) {
      setClienteExistente(clienteEncontrado);
      setFormData({
        ...formData,
        nome: clienteEncontrado.nome,
        email: clienteEncontrado.email || "",
      });
      toast({
        title: "Cliente encontrado!",
        description: `Bem-vindo de volta, ${clienteEncontrado.nome}!`,
      });
    } else {
      console.log(
        "ℹ️ Novo cliente será criado para telefone:",
        telefoneNumeros,
      );
      toast({
        title: "Novo cliente",
        description: "Um novo cadastro será criado para este telefone.",
      });
    }

    setStep(2);
  };

  const handleHorarioChange = (valor: string) => {
    const valorComMascara = aplicarMascaraHorario(valor);
    setHorarioInput(valorComMascara);

    if (valorComMascara.length === 5 && validarHorario(valorComMascara)) {
      setHorario(valorComMascara);
    } else {
      setHorario("");
    }
  };

  // Obter duração do serviço selecionado
  const getDuracaoServico = () => {
    if (!formData.servicoId || !servicos) return 30;
    const servico = servicos.find((s) => s.nome === formData.servicoId);
    return servico?.duracaoMinutos || 30;
  };

  // Verificar se horário está dentro do funcionamento (CORRIGIDO)
  const validacaoHorario =
    formData.data && horario && validarHorario(horario) && intervalosTrabalho
      ? verificarHorarioNoIntervalo(
          horario,
          intervalosTrabalho,
          formData.data,
          getDuracaoServico(),
        )
      : { valido: true };

  const handleSubmit = async () => {
    const telefoneNumeros = formData.telefone.replace(/\D/g, "");

    console.log("🚀 Iniciando submissão do agendamento:", {
      nome: formData.nome,
      telefone: telefoneNumeros,
      email: formData.email,
      data: formData.data ? format(formData.data, "yyyy-MM-dd") : null,
      horario,
      servicoId: formData.servicoId,
      clienteExistente: !!clienteExistente,
    });

    // Validação de campos obrigatórios
    if (
      !formData.nome ||
      !telefoneNumeros ||
      !formData.data ||
      !horario ||
      !formData.servicoId
    ) {
      console.log("❌ Campos obrigatórios não preenchidos");
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validação de formato do horário
    if (!validarHorario(horario)) {
      console.log("❌ Horário inválido:", horario);
      toast({
        title: "Horário inválido",
        description: "Digite um horário válido (HH:MM).",
        variant: "destructive",
      });
      return;
    }

    // VALIDAÇÃO OBRIGATÓRIA: Verificar se horário está dentro do funcionamento
    console.log("🕐 Validando horário de funcionamento:", {
      horario,
      data: format(formData.data, "yyyy-MM-dd"),
      duracaoServico: getDuracaoServico(),
      validacaoResult: validacaoHorario,
    });

    if (!validacaoHorario.valido) {
      console.log(
        "❌ Horário fora do funcionamento:",
        validacaoHorario.mensagem,
      );
      toast({
        title: "Horário fora do funcionamento",
        description: validacaoHorario.mensagem,
        variant: "destructive",
      });
      return;
    }

    // Verificação de conflito
    if (conflito?.temConflito) {
      console.log("❌ Conflito de horário detectado:", conflito);
      toast({
        title: "Horário ocupado",
        description: "Este horário está ocupado. Selecione outro horário.",
        variant: "destructive",
      });
      return;
    }

    try {
      let clienteId: string;

      // FLUXO OBRIGATÓRIO: Verificar se cliente existe ou criar novo
      if (!clienteExistente) {
        console.log("👤 Criando novo cliente:", {
          nome: formData.nome,
          telefone: telefoneNumeros,
          email: formData.email || "(vazio)",
        });

        const novoCliente = await criarClienteMutation.mutateAsync({
          nome: formData.nome,
          telefone: telefoneNumeros,
          email: formData.email || "", // E-mail opcional - string vazia se não preenchido
        });

        clienteId = novoCliente.id;
        console.log("✅ Novo cliente criado com ID:", clienteId);
      } else {
        clienteId = clienteExistente.id;
        console.log("✅ Usando cliente existente com ID:", clienteId);
      }

      // Criar agendamento vinculado ao cliente
      console.log("📅 Criando agendamento:", {
        clienteId,
        data: format(formData.data, "yyyy-MM-dd"),
        horario,
        servico: formData.servicoId,
        status: "agendado",
      });

      await createMutation.mutateAsync({
        clienteId,
        data: format(formData.data, "yyyy-MM-dd"),
        horario,
        servico: formData.servicoId,
        status: "agendado",
      });

      console.log("✅ Agendamento criado com sucesso!");
    } catch (error: any) {
      console.error("❌ Erro durante criação:", error);
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    console.log("🔄 Resetando formulário");
    setFormData({
      nome: "",
      telefone: "",
      email: "",
      data: undefined,
      servicoId: "",
    });
    setClienteExistente(null);
    setHorario("");
    setHorarioInput("");
    setStep(1);
  };

  // Validação de data (hoje até 30 dias) usando dayjs
  const today = dayjs();
  const minDate = today.toDate();
  const maxDate = today.add(30, "day").toDate();

  // Função para verificar se uma data deve ser desabilitada
  const isDateDisabled = (date: Date) => {
    const dayJsDate = dayjs(date);

    if (
      dayJsDate.isBefore(today, "day") ||
      dayJsDate.isAfter(today.add(30, "day"), "day")
    ) {
      return true;
    }

    if (intervalosTrabalho) {
      const diaSemana = getDiaSemana(date);
      const intervalosAtivos = intervalosTrabalho.filter(
        (i) => i.diaSemana === diaSemana && i.ativo,
      );
      return intervalosAtivos.length === 0;
    }

    return false;
  };

  // Obter horários de funcionamento para o dia selecionado
  const getHorariosFuncionamento = () => {
    if (!formData.data || !intervalosTrabalho) return null;

    const diaSemana = getDiaSemana(formData.data);
    const intervalosAtivos = intervalosTrabalho.filter(
      (i) => i.diaSemana === diaSemana && i.ativo,
    );

    if (intervalosAtivos.length === 0) return null;

    return intervalosAtivos
      .map((i) => `${i.horaInicio} às ${i.horaFim}`)
      .join(", ");
  };

  if (step === 3) {
    return (
      <Card className="mx-auto w-full max-w-md border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h3 className="mb-2 text-xl font-semibold text-green-800">
            Agendamento Criado!
          </h3>
          <p className="mb-6 text-green-700">
            Seu agendamento foi criado com sucesso.
          </p>
          <Button
            onClick={resetForm}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Novo Agendamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {modo === "publico" ? "Solicitar Agendamento" : "Novo Agendamento"}
        </CardTitle>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 pt-4">
          {[1, 2].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  step >= stepNumber
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600",
                )}
              >
                {stepNumber}
              </div>
              {stepNumber < 2 && (
                <div
                  className={cn(
                    "h-1 w-16",
                    step > stepNumber ? "bg-blue-600" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-gray-600">
          {step === 1 ? "Dados Pessoais" : "Data e Horário"}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <div className="relative">
                <Phone className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input
                  id="telefone"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => handleTelefoneChange(e.target.value)}
                  className="pl-10"
                  maxLength={15}
                />
              </div>
              {formData.telefone &&
                formData.telefone.replace(/\D/g, "").length < 10 && (
                  <p className="text-sm text-red-500">
                    Telefone deve ter pelo menos 10 dígitos
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                <Input
                  id="nome"
                  placeholder="Digite seu nome completo"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <p className="text-xs text-gray-500">
                O e-mail é opcional e pode ser deixado em branco
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={verificarClienteEAvancar}
                disabled={
                  !formData.nome ||
                  formData.telefone.replace(/\D/g, "").length < 10
                }
                className="flex items-center gap-2"
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Resumo dos dados */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="font-medium text-gray-900">Resumo dos dados:</h4>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Nome:</strong> {formData.nome}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Telefone:</strong> {formData.telefone}
                </p>
                {formData.email && (
                  <p className="text-sm text-gray-600">
                    <strong>E-mail:</strong> {formData.email}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1">
                  {clienteExistente ? (
                    <>
                      <UserCheck className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-600">
                        Cliente cadastrado
                      </span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-yellow-600">
                        Novo cliente (será cadastrado)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Serviço */}
            <div className="space-y-2">
              <Label>Serviço *</Label>
              <select
                value={formData.servicoId}
                onChange={(e) => {
                  setFormData({ ...formData, servicoId: e.target.value });
                  setHorario("");
                  setHorarioInput("");
                }}
                className="border-input text-foreground focus:ring-accent bg-background w-full cursor-pointer rounded-md border px-3 py-2 shadow-sm transition duration-200 focus:ring-2 focus:ring-offset-1 focus:outline-none"
              >
                <option value="">Selecione um serviço</option>
                {servicos?.map((s) => (
                  <option key={s.nome} value={s.nome}>
                    {s.nome} - R$ {s.preco} ({s.duracaoMinutos || 30}min)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Data Desejada *</Label>
              <p className="text-sm text-gray-600">
                Selecione uma data entre{" "}
                <strong>{dayjs(minDate).format("DD/MM/YYYY")}</strong> e{" "}
                <strong>{dayjs(maxDate).format("DD/MM/YYYY")}</strong>
              </p>
              <div className="w-full">
                <DayPicker
                  mode="single"
                  selected={formData.data}
                  onSelect={(date) => {
                    setFormData({ ...formData, data: date });
                    setHorario("");
                    setHorarioInput("");
                  }}
                  locale={ptBR}
                  className="border-border bg-card w-full rounded-md border p-4 text-[16px]"
                  disabled={isDateDisabled}
                />
              </div>
              {formData.data && (
                <div className="space-y-2">
                  <p className="text-sm text-green-600">
                    Data selecionada:{" "}
                    <strong>
                      {dayjs(formData.data).format(
                        "dddd, DD [de] MMMM [de] YYYY",
                      )}
                    </strong>
                  </p>
                  {getHorariosFuncionamento() && (
                    <p className="text-sm text-blue-600">
                      <strong>Horários de funcionamento:</strong>{" "}
                      {getHorariosFuncionamento()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Campo manual de horário */}
            <div className="space-y-2">
              <Label>Horário desejado *</Label>
              <div className="relative">
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
                  <p className="text-sm text-red-600">
                    Horário inválido. Use o formato HH:MM (ex: 14:30)
                  </p>
                )}

              {/* Validação de horário fora do funcionamento */}
              {horario &&
                validarHorario(horario) &&
                !validacaoHorario.valido && (
                  <p className="text-sm text-red-600">
                    {validacaoHorario.mensagem}
                  </p>
                )}
            </div>

            {/* Aviso de conflito e sugestão */}
            {conflito?.temConflito &&
              horario &&
              validarHorario(horario) &&
              validacaoHorario.valido && (
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
                              setHorarioInput(conflito.proximoDisponivel!);
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
              validacaoHorario.valido &&
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

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.data ||
                  !horario ||
                  !validarHorario(horario) ||
                  !formData.servicoId ||
                  !validacaoHorario.valido ||
                  conflito?.temConflito ||
                  createMutation.isPending ||
                  criarClienteMutation.isPending
                }
                className="flex items-center gap-2"
              >
                {createMutation.isPending || criarClienteMutation.isPending
                  ? "Criando..."
                  : "Confirmar Agendamento"}
                <CheckCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
