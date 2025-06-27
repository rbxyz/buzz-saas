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
import { MessageCircle, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function WhatsappCard() {
  const [showInstanceId, setShowInstanceId] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);

  // Função para mascarar valores sensíveis
  const maskValue = (value: string, show: boolean) => {
    if (!value) return "Não configurado";
    if (show) return value;
    return "●".repeat(Math.min(value.length, 20));
  };

  // Verificar se todas as variáveis estão configuradas
  const instanceId = process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID ?? "";
  const token = process.env.NEXT_PUBLIC_ZAPI_TOKEN ?? "";
  const clientToken = process.env.NEXT_PUBLIC_ZAPI_CLIENT_TOKEN ?? "";
  
  const isFullyConfigured = instanceId && token && clientToken;

  return (
    <Card
      className={cn(
        "w-full transition-all duration-200",
        isFullyConfigured && "border-green-200 ring-2 ring-green-500/20",
      )}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div
            className={cn(
              "rounded-lg p-2",
              isFullyConfigured
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-600",
            )}
          >
            <MessageCircle className="h-5 w-5" />
          </div>
          Integração WhatsApp
        </CardTitle>
        <CardDescription className="text-sm">
          Status das configurações Z-API via variáveis de ambiente
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            {isFullyConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <Label className="text-sm font-medium text-black">
                Status da Configuração
              </Label>
              <p className="text-xs text-gray-500">
                {isFullyConfigured 
                  ? "Todas as variáveis configuradas ✅" 
                  : "Variáveis faltando ❌"
                }
              </p>
            </div>
          </div>
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
              value={maskValue(instanceId, showInstanceId)}
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
              value={maskValue(token, showToken)}
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
              value={maskValue(clientToken, showClientToken)}
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
            📋 Status do Agente WhatsApp
          </h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p>• O agente é ativado automaticamente quando as variáveis estão configuradas</p>
            <p>• Não é necessário toggle manual - tudo é baseado nas variáveis de ambiente</p>
            <p>• Status atual: <strong>{isFullyConfigured ? "Ativo" : "Inativo"}</strong></p>
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
