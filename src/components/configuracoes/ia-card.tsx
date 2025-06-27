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
import { Zap, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function IaCard() {
  const [showApiKey, setShowApiKey] = useState(false);

  // Função para mascarar valores sensíveis
  const maskValue = (value: string, show: boolean) => {
    if (!value) return "Não configurado";
    if (show) return value;
    return "●".repeat(Math.min(value.length, 20));
  };

  // Verificar se a variável está configurada
  const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "";
  const isConfigured = !!groqApiKey;

  return (
    <Card
      className={cn(
        "w-full transition-all duration-200",
        isConfigured && "border-green-200 ring-2 ring-green-500/20",
      )}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div
            className={cn(
              "rounded-lg p-2",
              isConfigured
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-600",
            )}
          >
            <Zap className="h-5 w-5" />
          </div>
          Inteligência Artificial
        </CardTitle>
        <CardDescription className="text-sm">
          Status da configuração Groq AI via variáveis de ambiente
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <Label className="text-sm font-medium text-black">
                Status da Configuração
              </Label>
              <p className="text-xs text-gray-500">
                {isConfigured 
                  ? "API Key configurada ✅" 
                  : "API Key não configurada ❌"
                }
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center justify-between">
              Groq API Key
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
              value={maskValue(groqApiKey, showApiKey)}
              disabled
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Configurado via variável de ambiente GROQ_API_KEY
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            🤖 Status da IA
          </h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p>• A IA é ativada automaticamente quando a API Key está configurada</p>
            <p>• Contexto e instruções são inline no código (automático)</p>
            <p>• Status atual: <strong>{isConfigured ? "Ativa" : "Inativa"}</strong></p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Como configurar a API Key:
          </h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>1.</strong> Acesse console.groq.com e crie uma conta</p>
            <p><strong>2.</strong> Gere uma nova API Key</p>
            <p><strong>3.</strong> Configure a variável GROQ_API_KEY</p>
            <p><strong>Desenvolvimento:</strong> Arquivo .env.local</p>
            <p><strong>Produção:</strong> Painel do Vercel</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
