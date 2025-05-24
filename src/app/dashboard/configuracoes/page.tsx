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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

// Função para mascarar telefone
function mascararTelefone(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}

export default function ConfiguracoesPage() {
  const [whatsappAtivo, setWhatsappAtivo] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [dias, setDias] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [modoTreinoAtivo, setModoTreinoAtivo] = useState(false);
  const [contextoIA, setContextoIA] = useState("");
  const [dadosIA, setDadosIA] = useState("");
  const [servicos, setServicos] = useState<{ nome: string; preco: string }[]>(
    [] as { nome: string; preco: string }[],
  );

  const {
    data: configs,
    isPending: isLoading,
    refetch,
  } = trpc.configuracao.listar.useQuery();

  const valoresIniciais = useMemo(() => {
    if (!configs) return null;
    return {
      id: configs.id,
      nome: configs.nome,
      telefone: configs.telefone,
      endereco: configs.endereco,
      dias: configs.dias,
      horaInicio: configs.horaInicio,
      horaFim: configs.horaFim,
      instanceId: configs.instanceId,
      token: configs.token,
      whatsappAtivo: configs.whatsappAtivo,
      modoTreinoAtivo: configs.modoTreinoAtivo,
      contextoIA: configs.contextoIA,
      dadosIA: configs.dadosIA,
      servicos: configs.servicos || [],
    };
  }, [configs]);

  function servicosSaoIguais(
    a: { nome: string; preco: string }[],
    b: { nome: string; preco: string }[],
  ) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].nome !== b[i].nome || a[i].preco !== b[i].preco) return false;
    }
    return true;
  }

  const houveAlteracao = useMemo(() => {
    if (!valoresIniciais) return false;

    return !(
      nome === valoresIniciais.nome &&
      telefone === valoresIniciais.telefone &&
      endereco === valoresIniciais.endereco &&
      dias === valoresIniciais.dias &&
      horaInicio === valoresIniciais.horaInicio &&
      horaFim === valoresIniciais.horaFim &&
      instanceId === valoresIniciais.instanceId &&
      token === valoresIniciais.token &&
      whatsappAtivo === valoresIniciais.whatsappAtivo &&
      modoTreinoAtivo === valoresIniciais.modoTreinoAtivo &&
      contextoIA === valoresIniciais.contextoIA &&
      dadosIA === valoresIniciais.dadosIA &&
      servicosSaoIguais(servicos, valoresIniciais.servicos)
    );
  }, [
    nome,
    telefone,
    endereco,
    dias,
    horaInicio,
    horaFim,
    instanceId,
    token,
    whatsappAtivo,
    modoTreinoAtivo,
    contextoIA,
    dadosIA,
    servicos,
    valoresIniciais,
  ]);

  useEffect(() => {
    if (!configs) return;
    setNome(configs.nome || "");
    setTelefone(configs.telefone || "");
    setEndereco(configs.endereco || "");
    setDias(configs.dias || "");
    setHoraInicio(configs.horaInicio || "09:00");
    setHoraFim(configs.horaFim || "18:00");
    setInstanceId(configs.instanceId || "");
    setToken(configs.token || "");
    setWhatsappAtivo(configs.whatsappAtivo || false);
    setModoTreinoAtivo(configs.modoTreinoAtivo || false);
    setContextoIA(configs.contextoIA || "");
    setDadosIA(configs.dadosIA || "");
    setServicos(configs.servicos || []);
  }, [configs]);

  const mutation = trpc.configuracao.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      refetch();
    },
    onError: () => {
      toast.error("Erro ao salvar configurações. Tente novamente.");
    },
  });

  const salvarServicosMutation = trpc.configuracao.salvaServicos.useMutation({
    onSuccess: () => {
      toast.success("Serviços atualizados com sucesso!");
      refetch(); // recarrega configs se necessário
    },
    onError: () => {
      toast.error("Erro ao salvar os serviços.");
    },
  });

  function handleSalvarServicos() {
    const servicosValidos = servicos
      .filter((s) => s.nome.trim() && s.preco.trim())
      .map((s) => ({
        nome: s.nome.trim(),
        preco: s.preco.trim(),
      }));

    if (configs?.id) {
      salvarServicosMutation.mutate({
        id: configs.id,
        servicos: servicosValidos,
      });
    } else {
      toast.error("Configuração não carregada.");
    }
  }

  function handleSalvar() {
    const servicosValidos = servicos
      .filter((s) => s.nome.trim() && s.preco.trim())
      .map((s) => ({
        nome: s.nome.trim(),
        preco: s.preco.trim(),
      }));

    const payload = {
      nome,
      telefone,
      endereco,
      dias,
      horaInicio,
      horaFim,
      instanceId,
      token,
      whatsappAtivo,
      modoTreinoAtivo,
      contextoIA,
      dadosIA,
      servicos: servicosValidos,
    };

    if (configs?.id) {
      mutation.mutate({ ...payload, id: configs.id });
    } else {
      toast.error("Configuração inicial não carregada.");
    }
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setTelefone(mascararTelefone(valor));
  }

  function adicionarServico() {
    setServicos([...servicos, { nome: "", preco: "" }]);
  }

  function removerServico(index: number) {
    setServicos(servicos.filter((_, i) => i !== index));
  }

  function atualizarServico(
    index: number,
    campo: "nome" | "preco",
    valor: string,
  ) {
    const novosServicos = [...servicos];
    novosServicos[index][campo] = valor;
    setServicos(novosServicos);
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

      {/* Botão fixo no topo para salvar */}
      <div className="fixed right-4 z-50">
        <Button
          className="cursor-pointer border"
          onClick={handleSalvar}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Configurações da Conta</CardTitle>
            <CardDescription>
              Gerencie as informações da sua barbearia
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome da Empresa</Label>
              <Input
                id="nome"
                placeholder="Ex: Barbearia do João"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 91234-5678"
                value={telefone}
                onChange={handleTelefoneChange}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                placeholder="Rua Exemplo, 123 - Bairro - Cidade"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Horário de Funcionamento</CardTitle>
            <CardDescription>
              Defina os dias e horários de atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dias">Dias de Atendimento</Label>
              <Select value={dias} onValueChange={setDias}>
                <SelectTrigger id="dias">
                  <SelectValue placeholder="Selecione os dias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="segSab">Segunda a Sábado</SelectItem>
                  <SelectItem value="segSex">Segunda a Sexta</SelectItem>
                  <SelectItem value="todos">Todos os dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="horaInicio">Horário Início</Label>
              <Input
                type="time"
                id="horaInicio"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="horaFim">Horário Fim</Label>
              <Input
                type="time"
                id="horaFim"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serviços</CardTitle>
          <CardDescription>
            Cadastre os serviços oferecidos e seus preços
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {servicos.map((servico, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Nome do serviço"
                value={servico.nome}
                onChange={(e) =>
                  atualizarServico(index, "nome", e.target.value)
                }
              />
              <Input
                placeholder="Preço"
                value={servico.preco}
                onChange={(e) =>
                  atualizarServico(index, "preco", e.target.value)
                }
                className="w-24"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removerServico(index)}
              >
                Remover
              </Button>
            </div>
          ))}

          <Button onClick={adicionarServico} variant="outline">
            Adicionar Serviço
          </Button>
        </CardContent>
        <Button
          className="mb-4 ml-6 cursor-pointer border"
          variant="secondary"
          onClick={handleSalvarServicos}
          disabled={salvarServicosMutation.isPending}
        >
          {salvarServicosMutation.isPending
            ? "Salvando Serviços..."
            : "Salvar Serviços"}
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações do WhatsApp (Z-API)</CardTitle>
          <CardDescription>
            Ative e configure sua integração com WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={whatsappAtivo}
              onCheckedChange={setWhatsappAtivo}
              id="whatsappAtivo"
            />
            <Label htmlFor="whatsappAtivo" className="cursor-pointer">
              WhatsApp Ativo
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instanceId">Instance ID</Label>
            <Input
              id="instanceId"
              placeholder="ID da instância do Z-API"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              placeholder="Token do Z-API"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modo Treino IA</CardTitle>
          <CardDescription>
            Ative o modo treino para melhorar respostas e defina o contexto e
            dados da IA
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={modoTreinoAtivo}
              onCheckedChange={setModoTreinoAtivo}
              id="modoTreinoAtivo"
            />
            <Label htmlFor="modoTreinoAtivo" className="cursor-pointer">
              Modo Treino Ativo
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contextoIA">Contexto da IA</Label>
            <Textarea
              id="contextoIA"
              placeholder="Descreva o papel da IA..."
              value={contextoIA}
              onChange={(e) => setContextoIA(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dadosIA">Dados de Apoio para a IA</Label>
            <Textarea
              id="dadosIA"
              placeholder="Ex: Lista de serviços, regras da barbearia, informações úteis..."
              value={dadosIA}
              onChange={(e) => setDadosIA(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
