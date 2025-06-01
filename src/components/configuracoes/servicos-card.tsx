"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, DollarSign, Clock } from "lucide-react";

type Servico = {
  nome: string;
  preco: number;
  duracaoMinutos: number;
};

export function ServicosCard() {
  const [servicos, setServicos] = useState<Servico[]>([]);

  const { data: configuracao, refetch } = api.configuracao.listar.useQuery();

  const atualizarServicos = api.configuracao.atualizarServicos.useMutation({
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Serviços atualizados com sucesso!",
      });
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro!",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (configuracao?.servicos) {
      const servicosExistentes = configuracao.servicos as Servico[];
      setServicos(
        servicosExistentes.map((s) => ({
          nome: s.nome,
          preco: s.preco,
          duracaoMinutos: s.duracaoMinutos || 30,
        })),
      );
    }
  }, [configuracao]);

  const adicionarServico = () => {
    setServicos([...servicos, { nome: "", preco: 0, duracaoMinutos: 30 }]);
  };

  const removerServico = (index: number) => {
    setServicos(servicos.filter((_, i) => i !== index));
  };

  const atualizarServico = (
    index: number,
    campo: keyof Servico,
    valor: string | number,
  ) => {
    const novosServicos = [...servicos];
    const servicoAtual = novosServicos[index];

    const novoValor =
      campo === "preco" || campo === "duracaoMinutos"
        ? Number(valor)
        : String(valor); // Garante que seja string
    const servicoAtualizado: Servico = {
      nome:
        campo === "nome" ? (novoValor as string) : (servicoAtual?.nome ?? ""),
      preco:
        campo === "preco" ? (novoValor as number) : (servicoAtual?.preco ?? 0),
      duracaoMinutos:
        campo === "duracaoMinutos"
          ? (novoValor as number)
          : (servicoAtual?.duracaoMinutos ?? 30),
    };

    novosServicos[index] = servicoAtualizado;
    setServicos(novosServicos);
  };

  const handleSalvar = () => {
    if (!configuracao?.id) {
      toast({
        title: "Erro!",
        description: "Configuração não encontrada",
        variant: "destructive",
      });
      return;
    }

    const servicosValidos = servicos.filter(
      (s) => s.nome.trim() && s.preco > 0,
    );

    if (servicosValidos.length === 0) {
      toast({
        title: "Erro!",
        description: "Adicione pelo menos um serviço válido",
        variant: "destructive",
      });
      return;
    }

    atualizarServicos.mutate({
      id: configuracao.id,
      servicos: servicosValidos,
    });
  };

  return (
    <div className="space-y-6">
      {/* Card de Configuração de Serviços */}
      <Card className="w-full border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="rounded-lg bg-gray-100 p-2">
              <DollarSign className="h-5 w-5 text-gray-600" />
            </div>
            Serviços Oferecidos
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Configure os serviços oferecidos, preços e duração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Lista de Serviços</Label>
              <Button size="sm" onClick={adicionarServico}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar Serviço
              </Button>
            </div>

            {servicos.map((servico, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-4"
              >
                <div>
                  <Label className="text-xs">Nome do Serviço</Label>
                  <Input
                    placeholder="Ex: Corte de Cabelo"
                    value={servico.nome}
                    onChange={(e) =>
                      atualizarServico(index, "nome", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={servico.preco}
                    onChange={(e) =>
                      atualizarServico(
                        index,
                        "preco",
                        Number.parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Duração (minutos)</Label>
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    placeholder="30"
                    value={servico.duracaoMinutos}
                    onChange={(e) =>
                      atualizarServico(
                        index,
                        "duracaoMinutos",
                        Number.parseInt(e.target.value) || 30,
                      )
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removerServico(index)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {servicos.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <DollarSign className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>Nenhum serviço configurado</p>
                <p className="text-sm">
                  Adicione serviços para permitir agendamentos
                </p>
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSalvar}
            disabled={atualizarServicos.isPending}
          >
            {atualizarServicos.isPending ? "Salvando..." : "Salvar Serviços"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview dos serviços */}
      {servicos.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Preview dos Serviços</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Como os serviços aparecerão na landing page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {servicos
                .filter((s) => s.nome.trim())
                .map((servico, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{servico.nome}</div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {servico.duracaoMinutos} minutos
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        R$ {servico.preco.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
