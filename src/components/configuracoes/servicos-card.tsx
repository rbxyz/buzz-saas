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
import { toast } from "sonner";
import { Plus, Trash2, DollarSign, Loader2 } from "lucide-react";

type Servico = {
  nome: string;
  preco: number;
  duracaoMinutos: number;
};

export function ServicosCard() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const utils = api.useContext();

  const { data: config, isLoading } =
    api.configuracao.obterConfiguracaoCompleta.useQuery();

  const updateServicosMutation = api.configuracao.updateServicos.useMutation({
    onSuccess: () => {
      toast.success("Lista de serviços atualizada com sucesso!");
      void utils.configuracao.obterConfiguracaoCompleta.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao salvar serviços", {
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (config?.servicos) {
      setServicos(config.servicos);
    }
  }, [config]);

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

    if (!servicoAtual) return;

    const novoValor =
      campo === "preco" || campo === "duracaoMinutos"
        ? Number(valor)
        : valor;

    const servicoAtualizado: Servico = {
      ...servicoAtual,
      [campo]: novoValor,
    };

    novosServicos[index] = servicoAtualizado;
    setServicos(novosServicos);
  };

  const handleSalvar = () => {
    const servicosValidos = servicos.filter(
      (s) => s.nome && s.nome.trim() !== "" && s.preco >= 0 && s.duracaoMinutos > 0,
    );

    updateServicosMutation.mutate(servicosValidos);
  };

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
          <DollarSign className="h-5 w-5" />
          Serviços Oferecidos
        </CardTitle>
        <CardDescription>
          Configure os serviços oferecidos, preços e duração.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Lista de Serviços</Label>
            <Button size="sm" variant="outline" onClick={adicionarServico}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {servicos.map((servico, index) => (
            <div
              key={index}
              className="grid grid-cols-1 items-end gap-3 rounded-lg border p-4 md:grid-cols-4"
            >
              <div className="col-span-1 md:col-span-2">
                <Label className="text-xs">Nome do Serviço</Label>
                <Input
                  placeholder="Ex: Corte de Cabelo"
                  value={servico.nome}
                  onChange={(e) =>
                    atualizarServico(index, "nome", e.target.value)
                  }
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Label className="text-xs">Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={servico.preco}
                  onChange={(e) =>
                    atualizarServico(index, "preco", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Duração (min)</Label>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  placeholder="30"
                  value={servico.duracaoMinutos}
                  onChange={(e) =>
                    atualizarServico(index, "duracaoMinutos", e.target.value)
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removerServico(index)}
                  className="h-9 w-full"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}

          {servicos.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <DollarSign className="mx-auto mb-2 h-10 w-10" />
              <p className="font-medium">Nenhum serviço configurado</p>
              <p className="text-sm">
                Adicione serviços para permitir agendamentos.
              </p>
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={handleSalvar}
          disabled={updateServicosMutation.isPending}
        >
          {updateServicosMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Salvar Alterações
        </Button>
      </CardContent>
    </Card>
  );
}
