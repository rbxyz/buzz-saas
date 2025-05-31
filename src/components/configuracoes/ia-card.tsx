"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { trpc } from "@/utils/trpc";
import { toast } from "@/hooks/use-toast";
import { Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function IACard() {
  const [modoTreinoAtivo, setModoTreinoAtivo] = useState(false);
  const [contextoIA, setContextoIA] = useState("");
  const [dadosIA, setDadosIA] = useState("");

  const { data: configs, refetch } = trpc.configuracao.listar.useQuery();

  const atualizarIAMutation = trpc.configuracao.atualizarIA.useMutation({
    onSuccess: async () => {
      toast({
        title: "Sucesso!",
        description: "Configurações de IA atualizadas com sucesso!",
      });
      await refetch();
    },
    onError: () => {
      toast({
        title: "Erro!",
        description: "Erro ao salvar configurações de IA.",
        variant: "destructive",
      });
    },
  });

  const atualizarModoTreinoMutation =
    trpc.configuracao.atualizarModoTreino.useMutation({
      onSuccess: async () => {
        toast({
          title: "Sucesso!",
          description: "Modo treino atualizado com sucesso!",
        });
        await refetch();
      },
      onError: () => {
        toast({
          title: "Erro!",
          description: "Erro ao atualizar modo treino.",
          variant: "destructive",
        });
      },
    });

  function handleSalvarIA() {
    if (!configs?.id) {
      toast({
        title: "Erro!",
        description: "Configuração não carregada.",
        variant: "destructive",
      });
      return;
    }
    atualizarIAMutation.mutate({
      id: configs.id,
      contextoIA,
      dadosIA,
    });
  }

  function handleToggleModoTreino() {
    if (!configs?.id) {
      toast({
        title: "Erro!",
        description: "Configuração não carregada.",
        variant: "destructive",
      });
      return;
    }
    const novoModo = !modoTreinoAtivo;
    setModoTreinoAtivo(novoModo);
    atualizarModoTreinoMutation.mutate({
      id: configs.id,
      modoTreinoAtivo: novoModo,
    });
  }

  useEffect(() => {
    if (!configs) return;
    setModoTreinoAtivo(configs.modoTreinoAtivo || false);
    setContextoIA(configs.contextoIA || "");
    setDadosIA(configs.dadosIA || "");
  }, [configs]);

  return (
    <Card
      className={cn(
        "w-full transition-all duration-200",
        modoTreinoAtivo && "border-blue-200 ring-2 ring-blue-500/20",
      )}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div
            className={cn(
              "rounded-lg p-2",
              modoTreinoAtivo
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-600",
            )}
          >
            <Brain className="h-5 w-5" />
          </div>
          Inteligência Artificial
        </CardTitle>
        <CardDescription className="text-sm text-white">
          Configure o contexto e dados para o assistente virtual
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-black" />
            <div>
              <Label className="text-sm font-medium text-black">
                Modo Treino Inativo
              </Label>
              <p className="text-xs text-gray-500">
                Ativar configurações de IA
              </p>
            </div>
          </div>
          <Switch
            checked={modoTreinoAtivo}
            onCheckedChange={handleToggleModoTreino}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contextoIA" className="text-sm font-medium">
              Contexto da IA
            </Label>
            <Textarea
              id="contextoIA"
              value={contextoIA}
              onChange={(e) => setContextoIA(e.target.value)}
              placeholder="Ex: Você é um atendente virtual da Barbearia do João. Seja sempre educado e prestativo..."
              disabled={!modoTreinoAtivo}
              className="min-h-[100px] transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dadosIA" className="text-sm font-medium">
              Dados IA (JSON opcional)
            </Label>
            <Textarea
              id="dadosIA"
              value={dadosIA}
              onChange={(e) => setDadosIA(e.target.value)}
              placeholder='Ex: {"barbeiros": ["João", "Carlos"], "estilos": ["Degradê", "Navalhado"]}'
              disabled={!modoTreinoAtivo}
              className="min-h-[80px] font-mono text-sm transition-all duration-200"
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSalvarIA}
            disabled={!modoTreinoAtivo || atualizarIAMutation.isPending}
            className="w-full sm:w-auto"
          >
            {atualizarIAMutation.isPending
              ? "Salvando..."
              : "Salvar Configurações de IA"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
