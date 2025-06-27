"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { MessageCircle, Smartphone, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function WhatsappCard() {
  const [showInstanceId, setShowInstanceId] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);
  const [whatsappAtivo, setWhatsappAtivo] = useState(false);
  
  const { toast } = useToast();
  const { data: configs, refetch } = api.configuracao.listar.useQuery();

  const atualizarWhatsappMutation = api.configuracao.atualizarWhatsapp.useMutation({
    onSuccess: async () => {
      toast({
        title: "Sucesso!",
        description: "Status do WhatsApp atualizado com sucesso!",
      });
      await refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao atualizar status do WhatsApp.",
        variant: "destructive",
      });
    },
  });

  function handleToggleWhatsapp() {
    atualizarWhatsappMutation.mutate({
      whatsappAgentEnabled: !whatsappAtivo,
    });
  }

  useEffect(() => {
    if (!configs) return;
    setWhatsappAtivo(configs.whatsappAgentEnabled ?? false);
  }, [configs]);

  // Função para mascarar valores sensíveis
  const maskValue = (value: string, show: boolean) => {
    if (!value) return "Não configurado";
    if (show) return value;
    return "●".repeat(Math.min(value.length, 20));
  };

  return (
    <Card
      className={cn(
        "w-full transition-all duration-200",
        whatsappAtivo && "border-green-200 ring-2 ring-green-500/20",
      )}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div
            className={cn(
              "rounded-lg p-2",
              whatsappAtivo
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-600",
            )}
          >
            <MessageCircle className="h-5 w-5" />
          </div>
          Integração WhatsApp
        </CardTitle>
        <CardDescription className="text-sm">
          Configurações Z-API via variáveis de ambiente
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-gray-600" />
            <div>
              <Label className="text-sm font-medium text-black">
                WhatsApp Ativo
              </Label>
              <p className="text-xs text-gray-500">
                Ativar/desativar agente de WhatsApp
              </p>
            </div>
          </div>
          <Switch
            checked={whatsappAtivo}
            onCheckedChange={handleToggleWhatsapp}
            disabled={atualizarWhatsappMutation.isPending}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center justify-between">
              ZAPI Instance ID
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstanceId(!showInstanceId)}
                className="h-6 w-6 p-0"
              >
                {showInstanceId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </Label>
            <Input
              value={maskValue(process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID ?? "ZAPI_INSTANCE_ID", showInstanceId)}
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Configurado via variável de ambiente ZAPI_INSTANCE_ID
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center justify-between">
              ZAPI Token
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowToken(!showToken)}
                className="h-6 w-6 p-0"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </Label>
            <Input
              value={maskValue(process.env.NEXT_PUBLIC_ZAPI_TOKEN ?? "ZAPI_TOKEN", showToken)}
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Configurado via variável de ambiente ZAPI_TOKEN
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center justify-between">
              ZAPI Client Token
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClientToken(!showClientToken)}
                className="h-6 w-6 p-0"
              >
                {showClientToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </Label>
            <Input
              value={maskValue(process.env.NEXT_PUBLIC_ZAPI_CLIENT_TOKEN ?? "ZAPI_CLIENT_TOKEN", showClientToken)}
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Configurado via variável de ambiente ZAPI_CLIENT_TOKEN
            </p>
          </div>
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
