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
import { Brain, Zap, Key, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function IACard() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
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
    atualizarIAMutation.mutate({
      aiEnabled,
      contextoIA,
      dadosIA,
    });
  }

  function handleToggleAI() {
    setAiEnabled(!aiEnabled);
  }

  useEffect(() => {
    if (!configs) return;
    setAiEnabled(configs.aiEnabled ?? false);
    setContextoIA(configs.contextoIA ?? "");
    setDadosIA(configs.dadosIA ?? "");
  }, [configs]);

  // Função para mascarar valores sensíveis
  const maskValue = (value: string, show: boolean) => {
    if (!value) return "Não configurado";
    if (show) return value;
    return "●".repeat(Math.min(value.length, 30));
  };

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
          Configure contexto e dados para o assistente virtual
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
            onCheckedChange={handleToggleAI}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Chave API Groq
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowApiKey(!showApiKey)}
              className="h-6 w-6 p-0"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </Label>
          <Input
            value={maskValue(process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "GROQ_API_KEY", showApiKey)}
            disabled
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            Configurado via variável de ambiente GROQ_API_KEY •{" "}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Obter chave
            </a>
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
            <p className="text-xs text-gray-500">
              Define como a IA deve se comportar e responder
            </p>
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
            <p className="text-xs text-gray-500">
              Dados estruturados que a IA pode usar nas respostas
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSalvarIA}
            disabled={atualizarIAMutation.isPending || !aiEnabled}
            className="w-full sm:w-auto"
          >
            {atualizarIAMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Como configurar as variáveis de ambiente:
          </h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>Desenvolvimento:</strong> Crie um arquivo .env.local</p>
            <p><strong>Produção:</strong> Configure no painel do Vercel</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
