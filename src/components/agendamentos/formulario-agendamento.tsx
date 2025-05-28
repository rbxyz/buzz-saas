"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Clock, CalendarIcon, CheckCircle, ArrowLeft } from "lucide-react";

interface FormularioAgendamentoProps {
  modo?: "completo" | "publico";
}

export default function FormularioAgendamento({
  modo = "completo",
}: FormularioAgendamentoProps) {
  const isPublico = modo === "publico";
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [selectedService, setSelectedService] = useState<string>();
  const [step, setStep] = useState<
    "service" | "date" | "time" | "form" | "success"
  >(isPublico ? "form" : "service");

  // Dados do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Queries
  const { data: servicos, isLoading: loadingServicos } =
    api.agendamento.getServicos.useQuery();
  const { data: configuracoes } = api.agendamento.getConfiguracoes.useQuery();

  const { data: horariosData, isLoading: loadingHorarios } =
    api.agendamento.getHorariosDisponiveis.useQuery(
      {
        data: selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : "",
        servico: selectedService || "",
      },
      {
        enabled: !!selectedDate && !!selectedService && !isPublico,
      },
    );

  // Mutation para criar agendamento
  const criarAgendamento = api.agendamento.criarAgendamentoPublico.useMutation({
    onSuccess: () => {
      setStep("success");
      toast.success("Agendamento realizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mutation para solicitação pública
  const criarSolicitacao =
    api.agendamento.criarSolicitacaoAgendamento.useMutation({
      onSuccess: () => {
        setStep("success");
        toast.success(
          "Solicitação enviada com sucesso! Entraremos em contato em breve.",
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleServiceSelect = (service: string) => {
    setSelectedService(service);
    setStep("date");
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const hoje = dayjs();
    const diasAntecedencia = configuracoes?.diasAntecedenciaAgendamento || 30;
    const dataMinima = hoje.add(diasAntecedencia, "day");

    if (isPublico) {
      // Para modo público: exatamente entre 30 e 31 dias
      const dataMinimaPublico = hoje.add(30, "day");
      const dataMaximaPublico = hoje.add(31, "day");

      if (
        dayjs(date).isBefore(dataMinimaPublico) ||
        dayjs(date).isAfter(dataMaximaPublico)
      ) {
        toast.error(
          "Agendamentos só podem ser solicitados entre 30 e 31 dias da data atual",
        );
        return;
      }
    } else {
      // Para modo completo: usar configuração normal
      if (dayjs(date).isBefore(dataMinima)) {
        toast.error(
          `Agendamentos só podem ser feitos a partir de ${diasAntecedencia} dias da data atual`,
        );
        return;
      }
    }

    setSelectedDate(date);
    setSelectedTime(undefined);
    setStep(isPublico ? "success" : "time");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("form");
  };

  const handleSubmit = () => {
    if (isPublico) {
      if (!selectedDate || !nome || !telefone) {
        toast.error("Dados incompletos");
        return;
      }

      criarSolicitacao.mutate({
        nome,
        telefone,
        dataDesejada: dayjs(selectedDate).format("YYYY-MM-DD"),
      });
    } else {
      // Lógica original para agendamento completo
      if (!selectedDate || !selectedTime || !selectedService) {
        toast.error("Dados incompletos");
        return;
      }

      criarAgendamento.mutate({
        nome,
        email: email || undefined,
        telefone,
        data: dayjs(selectedDate).format("YYYY-MM-DD"),
        horario: selectedTime,
        servico: selectedService,
      });
    }
  };

  const resetForm = () => {
    setStep(isPublico ? "form" : "service");
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setSelectedService(undefined);
    setNome("");
    setEmail("");
    setTelefone("");
  };

  const goBack = () => {
    if (isPublico) {
      if (step === "date") setStep("form");
    } else {
      if (step === "date") setStep("service");
      else if (step === "time") setStep("date");
      else if (step === "form") setStep("time");
    }
  };

  // Calcular data mínima para o calendário
  const hoje = dayjs();
  let dataMinima: Date;
  let dataMaxima: Date | undefined;

  if (isPublico) {
    dataMinima = hoje.add(30, "day").toDate();
    dataMaxima = hoje.add(31, "day").toDate();
  } else {
    const diasAntecedencia = configuracoes?.diasAntecedenciaAgendamento || 30;
    dataMinima = hoje.add(diasAntecedencia, "day").toDate();
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Progress Steps */}
      <div className="mb-8 flex justify-center">
        <div className="flex items-center space-x-4">
          {(isPublico
            ? ["form", "date"]
            : ["service", "date", "time", "form"]
          ).map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === stepName ||
                  index <
                    (isPublico
                      ? ["form", "date"]
                      : ["service", "date", "time", "form"]
                    ).indexOf(step)
                    ? "bg-amber-500 text-white"
                    : "bg-gray-600 text-gray-300"
                }`}
              >
                {index + 1}
              </div>
              {index < (isPublico ? 1 : 3) && (
                <div
                  className={`mx-2 h-1 w-12 ${
                    index <
                    (isPublico
                      ? ["form", "date"]
                      : ["service", "date", "time", "form"]
                    ).indexOf(step)
                      ? "bg-amber-500"
                      : "bg-gray-600"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column - Steps */}
        <div>
          {!isPublico && step === "service" && (
            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CalendarIcon className="h-5 w-5 text-amber-400" />
                  Escolha o Serviço
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Selecione o serviço que deseja agendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingServicos ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {servicos?.map((servico) => (
                      <Button
                        key={servico.nome}
                        variant="outline"
                        className="h-auto w-full justify-between border-gray-600 bg-gray-700/50 p-4 text-white hover:bg-gray-600/50"
                        onClick={() => handleServiceSelect(servico.nome)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{servico.nome}</div>
                          <div className="text-sm text-gray-400">
                            {servico.duracaoMinutos} minutos
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-amber-400">
                            R$ {servico.preco.toFixed(2)}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "date" && (
            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CalendarIcon className="h-5 w-5 text-amber-400" />
                  Escolha a Data
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Selecione o dia para seu agendamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => {
                    if (isPublico) {
                      return (
                        date < hoje.add(30, "day").toDate() ||
                        (hoje.add(31, "day").toDate() &&
                          date > hoje.add(31, "day").toDate())
                      );
                    }
                    return date < dataMinima;
                  }}
                  className="rounded-md border border-gray-600 bg-gray-700/30"
                />
                <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-sm text-amber-300">
                    💡{" "}
                    {isPublico
                      ? "Solicitações podem ser feitas entre 30 e 31 dias da data atual"
                      : `Agendamentos podem ser feitos a partir de ${configuracoes?.diasAntecedenciaAgendamento || 30} dias da data atual`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isPublico && step === "time" && (
            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-amber-400" />
                  Escolha o Horário
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Horários disponíveis para{" "}
                  {dayjs(selectedDate).format("DD/MM/YYYY")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHorarios ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : horariosData?.erro ? (
                  <div className="py-8 text-center">
                    <p className="text-red-400">{horariosData.erro}</p>
                    <Button
                      variant="outline"
                      className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700"
                      onClick={() => setStep("date")}
                    >
                      Escolher Outra Data
                    </Button>
                  </div>
                ) : horariosData?.horarios.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-400">
                      Nenhum horário disponível para esta data
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700"
                      onClick={() => setStep("date")}
                    >
                      Escolher Outra Data
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {horariosData?.horarios.map((horario) => (
                      <Button
                        key={horario}
                        variant="outline"
                        className="h-10 border-gray-600 text-gray-300 hover:border-amber-500 hover:bg-amber-500/20"
                        onClick={() => handleTimeSelect(horario)}
                      >
                        {horario}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "form" && (
            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CheckCircle className="h-5 w-5 text-amber-400" />
                  {isPublico ? "Seus Dados" : "Seus Dados"}
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {isPublico
                    ? "Preencha seus dados para solicitar o agendamento"
                    : "Preencha seus dados para confirmar o agendamento"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nome" className="text-gray-300">
                    Nome Completo *
                  </Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    className="border-gray-600 bg-gray-700/50 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone" className="text-gray-300">
                    Telefone *
                  </Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="border-gray-600 bg-gray-700/50 text-white placeholder-gray-400"
                  />
                </div>
                {!isPublico && (
                  <div>
                    <Label htmlFor="email" className="text-gray-300">
                      E-mail (opcional)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="border-gray-600 bg-gray-700/50 text-white placeholder-gray-400"
                    />
                  </div>
                )}
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={handleSubmit}
                  disabled={
                    !nome ||
                    !telefone ||
                    (isPublico
                      ? criarSolicitacao.isPending
                      : criarAgendamento.isPending)
                  }
                >
                  {isPublico
                    ? criarSolicitacao.isPending
                      ? "Enviando..."
                      : "Solicitar Agendamento"
                    : criarAgendamento.isPending
                      ? "Agendando..."
                      : "Confirmar Agendamento"}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "success" && (
            <Card className="border-green-500/30 bg-green-500/10 backdrop-blur-sm">
              <CardContent className="py-8 text-center">
                <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-400" />
                <h3 className="mb-2 text-2xl font-bold text-green-400">
                  {isPublico
                    ? "Solicitação Enviada!"
                    : "Agendamento Confirmado!"}
                </h3>
                <p className="mb-6 text-gray-300">
                  {isPublico
                    ? "Sua solicitação foi recebida com sucesso. Entraremos em contato em breve para confirmar seu agendamento."
                    : "Seu agendamento foi realizado com sucesso. Você receberá uma confirmação em breve."}
                </p>
                <Button
                  onClick={resetForm}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isPublico
                    ? "Fazer Nova Solicitação"
                    : "Fazer Novo Agendamento"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Botão Voltar */}
          {((isPublico && step === "date") ||
            (!isPublico && step !== "service")) &&
            step !== "success" && (
              <Button
                variant="outline"
                className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={goBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
        </div>

        {/* Right Column - Summary */}
        <div>
          <Card className="sticky top-8 border-gray-700 bg-gray-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">
                {isPublico ? "Resumo da Solicitação" : "Resumo do Agendamento"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPublico && selectedService && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Serviço:</span>
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/20 text-amber-300"
                  >
                    {selectedService}
                  </Badge>
                </div>
              )}

              {selectedDate && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">
                    Data {isPublico ? "Desejada" : ""}:
                  </span>
                  <span className="font-medium text-white">
                    {dayjs(selectedDate).format("DD/MM/YYYY")}
                  </span>
                </div>
              )}

              {!isPublico && selectedTime && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Horário:</span>
                  <span className="font-medium text-white">{selectedTime}</span>
                </div>
              )}

              {!isPublico && selectedService && servicos && (
                <div className="flex items-center justify-between border-t border-gray-600 pt-4">
                  <span className="text-gray-400">Valor:</span>
                  <span className="text-xl font-bold text-amber-400">
                    R${" "}
                    {servicos
                      .find((s) => s.nome === selectedService)
                      ?.preco.toFixed(2)}
                  </span>
                </div>
              )}

              {isPublico && (
                <div className="border-t border-gray-600 pt-4">
                  <p className="text-sm text-gray-400">
                    💡 Após enviar sua solicitação, entraremos em contato para
                    confirmar horário e serviço disponível.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
