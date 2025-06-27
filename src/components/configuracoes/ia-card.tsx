"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { Brain, Zap, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function IACard() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState("");
  const [contextoIA, setContextoIA] = useState("");
  const [dadosIA, setDadosIA] = useState("");

  const { toast } = useToast();
  const { data: configs, refetch } = api.configuracao.listar.useQuery();

  const atualizarIAMutation = api.configuracao.atualizarIA.useMutation({
    onSuccess: async () => {
      toast({
        title: "Sucesso!",
        description: "Configurações de IA atualizadas com sucesso!",
      });
      await refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao salvar configurações de IA.",
        variant: "destructive",
      });
    },
  });

  function handleSalvarIA() {
    if (!groqApiKey.trim()) {
      toast({
        title: "Erro!",
        description: "A chave da API Groq é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    atualizarIAMutation.mutate({
      aiEnabled,
      groqApiKey,
      contextoIA,
      dadosIA,
    });
  }

  useEffect(() => {
    if (!configs) return;
    setAiEnabled(configs.aiEnabled ?? false);
    setGroqApiKey(configs.groqApiKey ?? "");
    setContextoIA(configs.contextoIA ?? "");
    setDadosIA(configs.dadosIA ?? "");
  }, [configs]);

  return (
    <Card
      className={cn(
        "w-full transition-all duration-200",
        aiEnabled && "border-blue-200 ring-2 ring-blue-500/20",
      )}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div
            className={cn(
              "rounded-lg p-2",
              aiEnabled
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-600",
            )}
          >
            <Brain className="h-5 w-5" />
          </div>
          Inteligência Artificial
        </CardTitle>
        <CardDescription className="text-sm">
          Configure a API Groq e contexto para o assistente virtual
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-gray-600" />
            <div>
              <Label className="text-sm font-medium text-black">
                IA Habilitada
              </Label>
              <p className="text-xs text-gray-500">
                Ativar assistente de inteligência artificial
              </p>
            </div>
          </div>
          <Switch
            checked={aiEnabled}
            onCheckedChange={setAiEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="groqApiKey" className="text-sm font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            Chave API Groq *
          </Label>
          <Input
            id="groqApiKey"
            type="password"
            placeholder="Digite sua chave da API Groq"
            value={groqApiKey}
            onChange={(e) => setGroqApiKey(e.target.value)}
            className="transition-all duration-200"
          />
          <p className="text-xs text-gray-500">
            Obtenha sua chave em: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://console.groq.com/keys</a>
          </p>
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
              disabled={!aiEnabled}
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
              disabled={!aiEnabled}
              className="min-h-[80px] font-mono text-sm transition-all duration-200"
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSalvarIA}
            disabled={atualizarIAMutation.isPending}
            className="w-full sm:w-auto"
          >
            {atualizarIAMutation.isPending ? "Salvando..." : "Salvar Configurações de IA"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
