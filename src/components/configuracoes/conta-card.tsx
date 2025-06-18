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
import { trpc } from "@/utils/trpc";
import { toast } from "@/hooks/use-toast";
import { Building2, Phone, MapPin } from "lucide-react";

export function ContaCard() {
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");

  // Buscando configs para preencher dados iniciais
  const { data: configs, refetch } = trpc.configuracao.listar.useQuery();

  // Mutation para atualizar configuração geral
  const mutation = trpc.configuracao.atualizarConfiguracao.useMutation({
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Configuração atualizada com sucesso!",
      });
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro!",
        description: error.message ?? "Erro ao atualizar a configuração.",
        variant: "destructive",
      });
    },
  });

  function handleSalvar() {
    const payload = {
      id: configs?.id ?? null,
      nomeEmpresa,
      telefone,
      endereco,
    };

    mutation.mutate(payload);
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

  return (
    <Card className="w-full border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="rounded-lg bg-gray-100 p-2">
            <Building2 className="h-5 w-5 text-gray-600" />
          </div>
          Informações da Empresa
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          Gerencie as informações básicas da sua empresa
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="nomeEmpresa"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Building2 className="h-4 w-4 text-gray-500" />
              Nome da Empresa
            </Label>
            <Input
              id="nomeEmpresa"
              placeholder="Ex: Barbearia do João"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              className="transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="telefone"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Phone className="h-4 w-4 text-gray-500" />
              Telefone
            </Label>
            <Input
              id="telefone"
              placeholder="(11) 91234-5678"
              value={telefone}
              onChange={handleTelefoneChange}
              className="transition-all duration-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="endereco"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <MapPin className="h-4 w-4 text-gray-500" />
            Endereço
          </Label>
          <Textarea
            id="endereco"
            placeholder="Rua Exemplo, 123 - Bairro - Cidade"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="min-h-[80px] transition-all duration-200"
          />
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSalvar}
            disabled={mutation.isPending}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? "Salvando..." : "Salvar Informações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
