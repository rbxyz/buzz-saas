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
import { MessageCircle, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function WhatsappCard() {
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [clientToken, setClientToken] = useState("");
  const [whatsappAtivo, setWhatsappAtivo] = useState(false);
  
  const { toast } = useToast();
  const { data: configs, refetch } = api.configuracao.listar.useQuery();

  const atualizarWhatsappMutation = api.configuracao.atualizarWhatsapp.useMutation({
    onSuccess: async () => {
      toast({
        title: "Sucesso!",
        description: "Integração WhatsApp atualizada com sucesso!",
      });
      await refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro!",
        description: error.message || "Erro ao salvar integração do WhatsApp.",
        variant: "destructive",
      });
    },
  });

  function handleSalvarWhatsapp() {
    if (!instanceId.trim() || !token.trim() || !clientToken.trim()) {
      toast({
        title: "Erro!",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    atualizarWhatsappMutation.mutate({
      zapiInstanceId: instanceId,
      zapiToken: token,
      zapiClientToken: clientToken,
      whatsappAgentEnabled: whatsappAtivo,
    });
  }

  useEffect(() => {
    if (!configs) return;
    setInstanceId(configs.zapiInstanceId ?? "");
    setToken(configs.zapiToken ?? "");
    setClientToken(configs.zapiClientToken ?? "");
    setWhatsappAtivo(configs.whatsappAgentEnabled ?? false);
  }, [configs]);

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
          Configure a API Z-API para automatizar mensagens via WhatsApp
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
                Ativar integração com WhatsApp
              </p>
            </div>
          </div>
          <Switch
            checked={whatsappAtivo}
            onCheckedChange={setWhatsappAtivo}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="instanceId" className="text-sm font-medium">
              Instance ID *
            </Label>
            <Input
              id="instanceId"
              placeholder="Digite o Instance ID"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              className="transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token" className="text-sm font-medium">
              Token *
            </Label>
            <Input
              id="token"
              type="password"
              placeholder="Digite o Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="transition-all duration-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientToken" className="text-sm font-medium">
            Client Token *
          </Label>
          <Input
            id="clientToken"
            type="password"
            placeholder="Digite o Client Token"
            value={clientToken}
            onChange={(e) => setClientToken(e.target.value)}
            className="transition-all duration-200"
          />
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSalvarWhatsapp}
            disabled={atualizarWhatsappMutation.isPending}
            className="w-full sm:w-auto"
          >
            {atualizarWhatsappMutation.isPending ? "Salvando..." : "Salvar Integração WhatsApp"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
