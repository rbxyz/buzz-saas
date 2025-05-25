"use client";

import type React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type HorariosPersonalizadosType = {
  horaInicioPadrao: string | null;
  horaFimPadrao: string | null;
  dias: {
    dia: string;
    horarioPersonalizado: boolean;
    horaInicio?: string | null;
    horaFim?: string | null;
  }[];
};

export default function ConfiguracoesPage() {
  const [whatsappAtivo, setWhatsappAtivo] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");

  const [dias, setDias] = useState<string[]>([]); // Ex: ['segunda', 'quarta']
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [horaInicioPadrao, setHoraInicioPadrao] = useState<string>("08:00"); // valor inicial exemplo
  const [horaFimPadrao, setHoraFimPadrao] = useState<string>("18:00");

  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [modoTreinoAtivo, setModoTreinoAtivo] = useState(false);
  const [contextoIA, setContextoIA] = useState("");
  const [dadosIA, setDadosIA] = useState("");
  const [servicos, setServicos] = useState<{ nome: string; preco: string }[]>(
    [] as { nome: string; preco: string }[],
  );
  const { data: horariosPersonalizados, isLoading: isLoadingHorarios } =
    trpc.configuracao.getHorariosPersonalizados.useQuery();

  const salvarHorariosMutation = trpc.configuracao.salvarHorarios.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Horários salvos com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao salvar horários: " + err.message);
    },
  });

  const mutation = trpc.configuracao.atualizarConfiguracao.useMutation({
    onSuccess: () => {
      toast.success("Configuração atualizada com sucesso!");
      refetch();
    },
    onError: () => {
      toast.error("Erro ao atualizar a configuração.");
    },
  });
  const salvarServicosMutation = trpc.configuracao.salvaServicos.useMutation({
    onSuccess: () => {
      toast.success("Tokens atualizados com sucesso!");
      refetch(); // recarrega configs se necessário
    },
    onError: () => {
      toast.error("Erro ao salvar os serviços.");
    },
  });
  const { mutate: atualizarWhatsapp, isLoading: salvandoWhatsapp } =
    trpc.configuracao.atualizarIntegracaoWhatsapp.useMutation({
      onSuccess: () => {
        toast.success("Serviços atualizados com sucesso!");
        refetch();
      },
      onError: () => {
        toast.error("Erro ao salvar integração do WhatsApp.");
      },
    });

  const handleSalvarWhatsapp = () => {
    if (!configs?.id) {
      toast.error("Configuração não encontrada.");
      return;
    }

    atualizarWhatsapp({
      id: configs?.id,
      instanceId,
      token,
      whatsappAtivo,
    });
  };

  const DIAS_SEMANA = [
    { label: "Domingo", value: "domingo" },
    { label: "Segunda", value: "segunda" },
    { label: "Terça", value: "terca" },
    { label: "Quarta", value: "quarta" },
    { label: "Quinta", value: "quinta" },
    { label: "Sexta", value: "sexta" },
    { label: "Sábado", value: "sabado" },
  ];

  const {
    data: configs,
    isPending: isLoading,
    refetch,
  } = trpc.configuracao.listar.useQuery();

  const [diasSelecionados, setDiasSelecionados] = useState<
    {
      dia: string;
      horarioPersonalizado: boolean;
      horaInicio?: string;
      horaFim?: string;
    }[]
  >([]);

  function handleSalvarServicos() {
    const servicosValidos = servicos
      .filter((s) => s.nome.trim() && s.preco.trim())
      .map((s) => ({
        nome: s.nome.trim(),
        preco: s.preco.trim(),
      }));

    if (configs?.id) {
      salvarServicosMutation.mutate({
        id: configs.id,
        servicos: servicosValidos,
      });
    } else {
      toast.error("Configuração não carregada.");
    }
  }

  function handleSalvar() {
    if (!configs?.id) {
      toast.error("Configuração inicial não carregada.");
      return;
    }

    const servicosValidos = servicos
      .filter((s) => s.nome.trim() && s.preco.trim())
      .map((s) => ({
        nome: s.nome.trim(),
        preco: s.preco.trim(),
      }));

    const payload = {
      nome,
      telefone,
      endereco,
      dias,
      horaInicio,
      horaFim,
      instanceId,
      token,
      whatsappAtivo,
      modoTreinoAtivo,
      contextoIA,
      dadosIA,
      servicos: servicosValidos,
    };

    mutation.mutate({ ...payload, id: configs.id });
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setTelefone(mascararTelefone(valor));
  }

  function adicionarServico() {
    setServicos([...servicos, { nome: "", preco: "" }]);
  }

  function removerServico(index: number) {
    setServicos(servicos.filter((_, i) => i !== index));
  }

  function atualizarServico(
    index: number,
    campo: "nome" | "preco",
    valor: string,
  ) {
    const novosServicos = [...servicos];
    novosServicos[index][campo] = valor;
    setServicos(novosServicos);
  }

  function mascararTelefone(valor: string): string {
    return valor
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  }

  function toggleDia(dia: string) {
    setDiasSelecionados((old) => {
      const existe = old.find((d) => d.dia === dia);
      if (existe) {
        // Remove o dia
        return old.filter((d) => d.dia !== dia);
      } else {
        // Adiciona o dia com horário personalizado falso e sem horários
        return [...old, { dia, horarioPersonalizado: false }];
      }
    });
  }

  function toggleHorarioPersonalizado(dia: string) {
    setDiasSelecionados((old) =>
      old.map((d) =>
        d.dia === dia
          ? {
              ...d,
              horarioPersonalizado: !d.horarioPersonalizado,
              // Se ativar, define horário padrão como default inicial
              horaInicio: !d.horarioPersonalizado
                ? horaInicioPadrao
                : undefined,
              horaFim: !d.horarioPersonalizado ? horaFimPadrao : undefined,
            }
          : d,
      ),
    );
  }

  function setHoraDia(
    dia: string,
    campo: "horaInicio" | "horaFim",
    valor: string,
  ) {
    setDiasSelecionados((old) =>
      old.map((d) => (d.dia === dia ? { ...d, [campo]: valor } : d)),
    );
  }

  async function handleSalvarFuncionamento() {
    if (diasSelecionados.length === 0) {
      toast.error("Selecione pelo menos um dia de funcionamento.");
      return;
    }

    if (!configs?.id) {
      toast.error("Configuração não encontrada.");
      return;
    }

    // Preparar dados para salvar
    const payload = {
      id: configs.id,
      horaInicioPadrao,
      horaFimPadrao,
      diasSelecionados: diasSelecionados.map((d) => ({
        dia: d.dia,
        horarioPersonalizado: d.horarioPersonalizado,
        horaInicio: d.horarioPersonalizado ? d.horaInicio : undefined,
        horaFim: d.horarioPersonalizado ? d.horaFim : undefined,
      })),
    };

    salvarHorariosMutation.mutate(payload);
  }

  // Carregar dados do backend ao montar componente
  useEffect(() => {
    if (!configs) return;

    // Setar horário padrão
    setHoraInicioPadrao(configs.horaInicio || "08:00");
    setHoraFimPadrao(configs.horaFim || "18:00");

    // Criar array diasSelecionados inicial a partir dos dias e horários personalizados do backend
    const diasAtivos = configs.dias || [];
    const horariosPersonalizadosData = configs.horariosPersonalizados || [];

    // Mapeia cada dia da semana para checar se está ativo e se tem horário personalizado
    const novosDiasSelecionados = DIAS_SEMANA.map(({ value }) => {
      const estaAtivo = diasAtivos.includes(value);

      if (!estaAtivo) {
        return null;
      }

      // Procura horário personalizado para o dia, se existir
      const horarioPersonalizadoObj = horariosPersonalizadosData.find(
        (h: any) => h.dia === value,
      );

      const temHorarioPersonalizado = Boolean(horarioPersonalizadoObj);

      return {
        dia: value,
        horarioPersonalizado: temHorarioPersonalizado,
        horaInicio: temHorarioPersonalizado
          ? horarioPersonalizadoObj?.horaInicio
          : undefined,
        horaFim: temHorarioPersonalizado
          ? horarioPersonalizadoObj?.horaFim
          : undefined,
      };
    }).filter(Boolean) as {
      dia: string;
      horarioPersonalizado: boolean;
      horaInicio?: string;
      horaFim?: string;
    }[];

    setDiasSelecionados(novosDiasSelecionados);
  }, [configs]);

  useEffect(() => {
    if (!configs) return;
    setNome(configs.nome || "");
    setTelefone(configs.telefone || "");
    setEndereco(configs.endereco || "");
    setDias(configs.dias || []);
    setHoraInicioPadrao(configs.horaInicio || "");
    setHoraFimPadrao(configs.horaFim || "");
    setHoraInicio(configs.horaInicio || "09:00");
    setHoraFim(configs.horaFim || "18:00");
    setInstanceId(configs.instanceId || "");
    setToken(configs.token || "");
    setWhatsappAtivo(configs.whatsappAtivo || false);
    setModoTreinoAtivo(configs.modoTreinoAtivo || false);
    setContextoIA(configs.contextoIA || "");
    setDadosIA(configs.dadosIA || "");
    setServicos(configs.servicos || []);
  }, [configs]);

  if (isLoading) {
    return (
      <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="border-border flex items-center gap-3 rounded-lg border bg-white px-6 py-4 shadow-xl dark:bg-zinc-900">
          <div className="border-muted border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
          <span className="text-foreground text-sm font-medium">
            Carregando configurações...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in mx-auto flex w-full flex-col gap-6 px-4 md:px-6 lg:px-8"
      style={{
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h1 className="font-sans text-3xl font-bold tracking-tight">
        Configurações
      </h1>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex w-full flex-col gap-6">
          {/* Área Conta - dados gerais */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Configurações da Conta</CardTitle>
              <CardDescription>
                Gerencie as informações da sua barbearia
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome da Empresa</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Barbearia do João"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(11) 91234-5678"
                  value={telefone}
                  onChange={handleTelefoneChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Textarea
                  id="endereco"
                  placeholder="Rua Exemplo, 123 - Bairro - Cidade"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>
            </CardContent>
            <div className="z-50 mb-6 ml-6 flex justify-start">
              <Button
                className="cursor-pointer border"
                onClick={handleSalvar}
                disabled={mutation.isPending}
                style={{
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  borderColor: "hsl(var(--primary))",
                }}
              >
                {mutation.isPending
                  ? "Salvando..."
                  : "Salvar alterações de conta"}
              </Button>
            </div>
          </Card>

          {/* Serviços */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Serviços</CardTitle>
              <CardDescription>
                Cadastre os serviços oferecidos e seus preços
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-4">
              {servicos.map((servico, index) => (
                <div
                  key={index}
                  className="flex flex-col items-start gap-2 sm:flex-row sm:items-center"
                >
                  <Input
                    className="w-full sm:w-1/2"
                    placeholder="Nome do serviço"
                    value={servico.nome}
                    onChange={(e) =>
                      atualizarServico(index, "nome", e.target.value)
                    }
                  />
                  <Input
                    className="w-full sm:w-1/3"
                    placeholder="Preço"
                    value={servico.preco}
                    onChange={(e) =>
                      atualizarServico(index, "preco", e.target.value)
                    }
                  />
                  <Button
                    variant="outline"
                    onClick={() => removerServico(index)}
                    className="w-full sm:w-auto"
                  >
                    Remover
                  </Button>
                </div>
              ))}

              <Button
                className="hover:bg-muted w-full cursor-pointer"
                variant="outline"
                onClick={adicionarServico}
              >
                Adicionar Serviço
              </Button>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full cursor-pointer"
                onClick={handleSalvarServicos}
              >
                Salvar Serviços
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Área Horários e Dias de Funcionamento */}
        <Card className="w-160">
          <CardHeader>
            <CardTitle>Horários e Dias de Funcionamento</CardTitle>
            <CardDescription>
              Selecione os dias e, se necessário, configure horários
              personalizados
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {/* Horário padrão global */}
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
              <div className="flex flex-col gap-1">
                <Label htmlFor="horaInicioPadrao">
                  Horário Padrão - Início
                </Label>
                <Input
                  type="time"
                  id="horaInicioPadrao"
                  value={horaInicioPadrao}
                  onChange={(e) => setHoraInicioPadrao(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="horaFimPadrao">Horário Padrão - Fim</Label>
                <Input
                  type="time"
                  id="horaFimPadrao"
                  value={horaFimPadrao}
                  onChange={(e) => setHoraFimPadrao(e.target.value)}
                />
              </div>
            </div>

            {/* Dias da semana com horários personalizados */}
            <div className="flex flex-col gap-4">
              {DIAS_SEMANA.map(({ label, value }) => {
                const diaSelecionado = diasSelecionados.find(
                  (d) => d.dia === value,
                );

                return (
                  <div
                    key={value}
                    className="flex flex-col gap-2 border-b pb-3"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        className="h-6 w-6 cursor-pointer"
                        id={value}
                        checked={!!diaSelecionado}
                        onCheckedChange={() => toggleDia(value)}
                      />
                      <Label htmlFor={value} className="text-base">
                        {label}
                      </Label>

                      {diaSelecionado && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            className="h-5 w-5"
                            id={`horario-${value}`}
                            checked={diaSelecionado.horarioPersonalizado}
                            onCheckedChange={() =>
                              toggleHorarioPersonalizado(value)
                            }
                          />
                          <Label
                            htmlFor={`horario-${value}`}
                            className="text-muted-foreground text-sm"
                          >
                            Horário personalizado
                          </Label>
                        </div>
                      )}
                    </div>

                    {diaSelecionado?.horarioPersonalizado && (
                      <div className="ml-8 flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`horaInicio-${value}`}>Início</Label>
                          <Input
                            type="time"
                            id={`horaInicio-${value}`}
                            value={diaSelecionado.horaInicio || ""}
                            onChange={(e) =>
                              setHoraDia(value, "horaInicio", e.target.value)
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor={`horaFim-${value}`}>Fim</Label>
                          <Input
                            type="time"
                            id={`horaFim-${value}`}
                            value={diaSelecionado.horaFim || ""}
                            onChange={(e) =>
                              setHoraDia(value, "horaFim", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Placeholder para feriados */}
            <div className="mt-6">
              <Label className="text-base">Feriados (em breve)</Label>
              <p className="text-muted-foreground text-sm">
                Cadastro e exclusão de feriados por data e nome do feriado.
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleSalvarFuncionamento}
              disabled={salvarHorariosMutation.isPending}
              className="w-fit self-start"
            >
              {salvarHorariosMutation.isPending
                ? "Salvando..."
                : "Salvar Horários"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {/* Área IA - Modo Treino e Contexto */}
        <Card
          className={cn(
            "w-full md:flex-1",
            modoTreinoAtivo && "border-primary border-2",
          )}
        >
          <CardHeader>
            <CardTitle>IA - Modo Treino e Contexto</CardTitle>
            <CardDescription>
              Configure o contexto usado pela IA e ative o modo treino
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-2">
              <SwitchPrimitives.Root
                checked={modoTreinoAtivo}
                onCheckedChange={setModoTreinoAtivo}
                className={cn(
                  "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:outline-none",
                  "bg-zinc-200 dark:bg-zinc-800",
                  "data-[state=checked]:bg-primary",
                  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                )}
              >
                <SwitchPrimitives.Thumb
                  className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
                  )}
                />
              </SwitchPrimitives.Root>

              <Label
                className={cn(modoTreinoAtivo && "text-primary font-medium")}
              >
                Modo Treino Ativo
              </Label>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contextoIA">Contexto da IA</Label>
              <Textarea
                id="contextoIA"
                value={contextoIA}
                onChange={(e) => setContextoIA(e.target.value)}
                placeholder="Ex: Você é um atendente virtual da Barbearia do João..."
                disabled={!modoTreinoAtivo}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dadosIA">Dados IA (JSON opcional)</Label>
              <Textarea
                id="dadosIA"
                value={dadosIA}
                onChange={(e) => setDadosIA(e.target.value)}
                placeholder='Ex: {"barbeiros": ["João", "Carlos"], "estilos": ["Degradê", "Navalhado"]}'
                disabled={!modoTreinoAtivo}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-60 cursor-pointer"
              onClick={handleSalvar}
              disabled={!modoTreinoAtivo}
            >
              Salvar IA e Integrações
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Área WhatsApp */}
      <Card className={cn(whatsappAtivo && "border-primary border-2")}>
        <CardHeader>
          <CardTitle>Integração com WhatsApp</CardTitle>
          <CardDescription>
            Configure a API Z-API com Instance ID e Token
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2">
            <SwitchPrimitives.Root
              checked={whatsappAtivo}
              onCheckedChange={setWhatsappAtivo}
              className={cn(
                "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
                "focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:outline-none",
                "bg-zinc-200 dark:bg-zinc-800",
                "data-[state=checked]:bg-primary",
              )}
            >
              <SwitchPrimitives.Thumb
                className={cn(
                  "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                  "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
                )}
              />
            </SwitchPrimitives.Root>
            <Label className={cn(whatsappAtivo && "text-primary font-medium")}>
              WhatsApp Ativo
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instanceId">Instance ID</Label>
            <Input
              id="instanceId"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              disabled={!whatsappAtivo}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={!whatsappAtivo}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            className="w-60 cursor-pointer"
            onClick={handleSalvarWhatsapp} // <- defina essa função
            disabled={!whatsappAtivo}
          >
            Salvar Integração WhatsApp
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
