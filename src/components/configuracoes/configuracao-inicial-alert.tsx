"use client";

import { AlertCircle, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';

export function ConfiguracaoInicialAlert() {
  const router = useRouter();
  const { data: configStatus } = api.configuracao.verificarConfiguracaoInicial.useQuery();

  if (!configStatus || configStatus.configuracaoInicialCompleta) {
    return null;
  }

  return (
    <Alert className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Configuração inicial incompleta:</strong> {configStatus.mensagem}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/configuracoes')}
          className="ml-4"
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurar
        </Button>
      </AlertDescription>
    </Alert>
  );
} 