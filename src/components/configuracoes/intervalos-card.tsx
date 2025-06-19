"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Plus, Trash2, Clock } from "lucide-react";

const DIAS_SEMANA = [
  { label: "Segunda-feira", value: "segunda" },
  { label: "Terça-feira", value: "terca" },
  { label: "Quarta-feira", value: "quarta" },
  { label: "Quinta-feira", value: "quinta" },
  { label: "Sexta-feira", value: "sexta" },
  { label: "Sábado", value: "sabado" },
  { label: "Domingo", value: "domingo" },
] as const;

const TURNOS = [
  { label: "Manhã", value: "manha" },
  { label: "Tarde", value: "tarde" },
  { label: "Noite", value: "noite" },
] as const;

type DiaSemana = (typeof DIAS_SEMANA)[number]["value"];
type Turno = (typeof TURNOS)[number]["value"];

type Intervalo = {
  horaInicio: string;
  horaFim: string;
  turno: Turno;
};

export function IntervalosCard() {
  const [diaSelecionado, setDiaSelecionado] = useState<DiaSemana>("segunda");
  const [intervalos, setIntervalos] = useState<Intervalo[]>([]);

  const { data: intervalosExistentes, refetch } =
    api.intervalosTrabalho.listar.useQuery();

  const salvarIntervalos = api.intervalosTrabalho.salvarIntervalos.useMutation({
    onSuccess: () => {
      toast.success("Intervalos salvos com sucesso!");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const adicionarIntervalo = () => {
    setIntervalos([
      ...intervalos,
      { horaInicio: "09:00", horaFim: "12:00", turno: "manha" },
    ]);
  };

  const removerIntervalo = (index: number) => {
    setIntervalos(intervalos.filter((_, i) => i !== index));
  };

  const atualizarIntervalo = (
    index: number,
    campo: keyof Intervalo,
    valor: string,
  ) => {
    const novosIntervalos = [...intervalos];
    novosIntervalos[index] = { ...novosIntervalos[index]!, [campo]: valor };
    setIntervalos(novosIntervalos);
  };

  const handleSalvar = () => {
    if (intervalos.length === 0) {
      toast.info("Adicione pelo menos um intervalo ou deixe vazio para marcar como fechado");
    }

    salvarIntervalos.mutate({
      diaSemana: diaSelecionado,
      intervalos,
    });
  };

  const carregarIntervalos = useCallback(
    (dia: DiaSemana) => {
      console.log("🔍 Carregando intervalos para:", dia);
      console.log("📊 Intervalos existentes:", intervalosExistentes);

      const intervalosDay =
        intervalosExistentes?.filter((i) => i.diaSemana === dia) ?? [];

      console.log("📋 Intervalos filtrados:", intervalosDay);

      setIntervalos(
        intervalosDay.map((i) => ({
          horaInicio: i.horaInicio,
          horaFim: i.horaFim,
          turno: i.turno || "manha",
        })),
      );
    },
    [intervalosExistentes],
  );

  const handleDiaChange = (dia: DiaSemana) => {
    setDiaSelecionado(dia);
    carregarIntervalos(dia);
  };

  // Carregar intervalos quando a página carrega
  useEffect(() => {
    if (intervalosExistentes) {
      carregarIntervalos(diaSelecionado);
    }
  }, [intervalosExistentes, diaSelecionado, carregarIntervalos]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Configuração */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="rounded-lg bg-gray-100 p-2">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            Configurar Intervalos de Trabalho
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Selecione o dia e configure os horários de trabalho
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Dia da Semana</Label>
            <Select value={diaSelecionado} onValueChange={handleDiaChange}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/20 backdrop-blur-sm">
                {DIAS_SEMANA.map((dia) => (
                  <SelectItem
                    className="cursor-pointer"
                    key={dia.value}
                    value={dia.value}
                  >
                    {dia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Intervalos de Trabalho</Label>
              <Button
                className="cursor-pointer"
                size="sm"
                onClick={adicionarIntervalo}
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            {intervalos.map((intervalo, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border p-3"
              >
                <div className="flex-1">
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="time"
                    value={intervalo.horaInicio}
                    onChange={(e) =>
                      atualizarIntervalo(index, "horaInicio", e.target.value)
                    }
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="time"
                    value={intervalo.horaFim}
                    onChange={(e) =>
                      atualizarIntervalo(index, "horaFim", e.target.value)
                    }
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Turno</Label>
                  <Select
                    value={intervalo.turno}
                    onValueChange={(value: Turno) =>
                      atualizarIntervalo(index, "turno", value)
                    }
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/20 backdrop-blur-sm">
                      {TURNOS.map((turno) => (
                        <SelectItem key={turno.value} value={turno.value}>
                          {turno.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="cursor-pointer"
                  size="sm"
                  variant="outline"
                  onClick={() => removerIntervalo(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {intervalos.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <Clock className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>Nenhum intervalo configurado</p>
                <p className="text-sm">Este dia será marcado como fechado</p>
              </div>
            )}
          </div>

          <Button
            className="w-full cursor-pointer"
            onClick={handleSalvar}
            disabled={salvarIntervalos.isPending}
          >
            {salvarIntervalos.isPending ? "Salvando..." : "Salvar Intervalos"}
          </Button>
        </CardContent>
      </Card>

      {/* Visualização */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Horários Configurados</CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Visualização dos horários de trabalho por dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DIAS_SEMANA.map((dia) => {
              const intervalosDay =
                intervalosExistentes?.filter(
                  (i) => i.diaSemana === dia.value,
                ) ?? [];

              console.log(`📅 ${dia.label}:`, intervalosDay);

              return (
                <div key={dia.value} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{dia.label}</span>
                    {intervalosDay.length === 0 && (
                      <Badge variant="secondary">Fechado</Badge>
                    )}
                  </div>

                  {intervalosDay.length > 0 && (
                    <div className="space-y-1">
                      {intervalosDay.map((intervalo, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {intervalo.horaInicio} - {intervalo.horaFim}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {
                              TURNOS.find((t) => t.value === intervalo.turno)
                                ?.label
                            }
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
