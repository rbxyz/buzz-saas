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
import { trpc } from "@/utils/trpc";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function WhatsappCard() {
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [whatsappAtivo, setWhatsappAtivo] = useState(false);

  const { data: configs, refetch } = trpc.configuracao.listar.useQuery();

  const atualizarWhatsappMutation =
    trpc.configuracao.atualizarIntegracaoWhatsapp.useMutation({
      onSuccess: async () => {
        toast({
          title: "Sucesso!",
          description: "Integração WhatsApp atualizada com sucesso!",
        });
        await refetch();
      },
      onError: () => {
        toast({
          title: "Erro!",
          description: "Erro ao salvar integração do WhatsApp.",
          variant: "destructive",
        });
      },
    });

  function handleSalvarWhatsapp() {
    if (!configs?.id) {
      toast({
        title: "Erro!",
        description: "Configuração não carregada.",
        variant: "destructive",
      });
      return;
    }
    atualizarWhatsappMutation.mutate({
      id: configs.id,
      instanceId,
      token,
      whatsappAtivo,
    });
  }

  useEffect(() => {
    if (!configs) return;
    setInstanceId(configs.instanceId || "");
    setToken(configs.token || "");
    setWhatsappAtivo(configs.whatsappAtivo || false);
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
        <CardDescription className="text-sm text-white">
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
          <Switch checked={whatsappAtivo} onCheckedChange={setWhatsappAtivo} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="instanceId" className="text-sm font-medium">
              Instance ID
            </Label>
            <Input
              id="instanceId"
              placeholder="Digite o Instance ID"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              disabled={!whatsappAtivo}
              className="transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token" className="text-sm font-medium">
              Token
            </Label>
            <Input
              id="token"
              type="password"
              placeholder="Digite o Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={!whatsappAtivo}
              className="transition-all duration-200"
            />
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSalvarWhatsapp}
            disabled={!whatsappAtivo || atualizarWhatsappMutation.isPending}
            className="w-full sm:w-auto"
          >
            {atualizarWhatsappMutation.isPending
              ? "Salvando..."
              : "Salvar Integração WhatsApp"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
