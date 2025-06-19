"use client";

import type React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Building2, Phone, MapPin, Loader2 } from "lucide-react";

export function ContaCard() {
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");

  const utils = api.useContext();

  // Buscando configs para preencher dados iniciais
  const { data: configs, isLoading } = api.configuracao.listar.useQuery();

  // Mutation para atualizar configuração geral
  const mutation = api.configuracao.atualizarConfiguracao.useMutation({
    onSuccess: () => {
      toast.success("Informações da empresa atualizadas com sucesso!");
      void utils.configuracao.listar.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar informações", {
        description: error.message,
      });
    },
  });

  function handleSalvar() {
    mutation.mutate({
      nomeEmpresa,
      telefone,
      endereco,
    });
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setTelefone(mascararTelefone(valor));
  }

  function mascararTelefone(valor: string): string {
    return valor
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  }

  // Carregar dados do backend ao montar componente
  useEffect(() => {
    if (!configs) return;
    setNomeEmpresa(configs.nomeEmpresa ?? "");
    setTelefone(configs.telefone ?? "");
    setEndereco(configs.endereco ?? "");
  }, [configs]);

  if (isLoading) {
    return (
      <Card className="flex h-full min-h-[300px] w-full items-center justify-center border-gray-200 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="w-full border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground flex items-center gap-3 text-lg">
          <Building2 className="h-5 w-5" />
          Informações da Empresa
        </CardTitle>
        <CardDescription>
          Gerencie as informações básicas da sua empresa.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="nomeEmpresa"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Nome da Empresa
            </Label>
            <Input
              id="nomeEmpresa"
              placeholder="Ex: Barbearia do João"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="telefone"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              Telefone
            </Label>
            <Input
              id="telefone"
              placeholder="(11) 91234-5678"
              value={telefone}
              onChange={handleTelefoneChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="endereco"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Endereço
          </Label>
          <Textarea
            id="endereco"
            placeholder="Rua Exemplo, 123 - Bairro - Cidade"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSalvar}
            disabled={mutation.isPending}
            className="w-full sm:w-auto"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar Informações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
