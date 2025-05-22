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
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";

export default function ConfiguracoesPage() {
  // Estados dos campos
  const [whatsappAtivo, setWhatsappAtivo] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

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

  // Busca as configurações ao montar o componente
  const {
    data: configs,
    isLoading,
    error,
    refetch,
  } = trpc.configuracao.listar.useQuery();

  // Atualiza estados com os dados carregados
  useEffect(() => {
    if (configs) {
      // Espera configs ser array com {chave, valor}
      setNome(configs.find((c) => c.chave === "nome")?.valor || "");
      setTelefone(configs.find((c) => c.chave === "telefone")?.valor || "");
      setEndereco(configs.find((c) => c.chave === "endereco")?.valor || "");
      setDias(configs.find((c) => c.chave === "dias")?.valor || "");
      setHoraInicio(
        configs.find((c) => c.chave === "horaInicio")?.valor || "09:00",
      );
      setHoraFim(configs.find((c) => c.chave === "horaFim")?.valor || "18:00");
      setInstanceId(configs.find((c) => c.chave === "instanceId")?.valor || "");
      setToken(configs.find((c) => c.chave === "token")?.valor || "");
      setWhatsappAtivo(
        configs.find((c) => c.chave === "whatsappAtivo")?.valor === "true",
      );
      setModoTreinoAtivo(
        configs.find((c) => c.chave === "modoTreinoAtivo")?.valor === "true",
      );
      setContextoIA(configs.find((c) => c.chave === "contextoIA")?.valor || "");
      setDadosIA(configs.find((c) => c.chave === "dadosIA")?.valor || "");
    }
  }, [configs]);

  // Mutação para salvar
  const salvarConfigs = trpc.configuracao.salvar.useMutation({
    onSuccess: () => {
      setModalAberto(true);
      refetch();
    },
    onError: () => {
      alert("Erro ao salvar configurações. Tente novamente.");
    },
  });

  // Função para aplicar máscara manual no telefone
  function mascararTelefone(valor: string) {
    // Remove tudo que não for número
    let numeros = valor.replace(/\D/g, "");

    // Aplica máscara (99) 99999-9999 ou (99) 9999-9999
    if (numeros.length > 11) numeros = numeros.slice(0, 11);

    if (numeros.length <= 10) {
      // Formato (99) 9999-9999
      numeros = numeros.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else {
      // Formato (99) 99999-9999
      numeros = numeros.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
    }

    // Remove traço final se não tiver 4 números no final
    numeros = numeros.replace(/-$/, "");

    return numeros;
  }

  // Manipulador para telefone com máscara
  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    const valorMascarado = mascararTelefone(valor);
    setTelefone(valorMascarado);
  }

  function handleSalvar() {
    // Envia todas as configs como array de objetos chave/valor
    const dados = [
      { chave: "nome", valor: nome },
      { chave: "telefone", valor: telefone },
      { chave: "endereco", valor: endereco },
      { chave: "dias", valor: dias },
      { chave: "horaInicio", valor: horaInicio },
      { chave: "horaFim", valor: horaFim },
      { chave: "instanceId", valor: instanceId },
      { chave: "token", valor: token },
      { chave: "whatsappAtivo", valor: whatsappAtivo ? "true" : "false" },
      { chave: "modoTreinoAtivo", valor: modoTreinoAtivo ? "true" : "false" },
      { chave: "contextoIA", valor: contextoIA },
      { chave: "dadosIA", valor: dadosIA },
    ];

    salvarConfigs.mutate(dados);
  }

  if (isLoading) return <p>Carregando configurações...</p>;
  if (error) return <p>Erro ao carregar configurações: {error.message}</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

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
              <Label htmlFor="nome">Nome da Barbearia</Label>
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
                onChange={handleTelefoneChange} // <--- usa a função com máscara
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inicio">Início</Label>
                <Input
                  id="inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fim">Fim</Label>
                <Input
                  id="fim"
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integração Z-API</CardTitle>
          <CardDescription>
            Configure a integração com o WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp">WhatsApp Ativo</Label>
            <Switch
              id="whatsapp"
              checked={whatsappAtivo}
              onCheckedChange={setWhatsappAtivo}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instance">Instance ID</Label>
            <Input
              id="instance"
              placeholder="ex: abcd1234"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              placeholder="ex: zapi-xyz987"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSalvar}
          className="mt-4"
          disabled={salvarConfigs.isLoading}
        >
          {salvarConfigs.isLoading ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modo Treino da IA</CardTitle>
          <CardDescription>
            Permite treinar a IA com contexto e dados personalizados
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="modo-treino">Ativar Modo Treino</Label>
            <Switch
              id="modo-treino"
              checked={modoTreinoAtivo}
              onCheckedChange={setModoTreinoAtivo}
              className={`relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-300 transition-colors duration-200 ease-in-out data-[state=checked]:bg-green-500`}
            >
              <span
                className={`${
                  modoTreinoAtivo ? "translate-x-5" : "translate-x-0"
                } pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </Switch>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contexto">Contexto</Label>
            <Textarea
              id="contexto"
              placeholder="Descreva o contexto que a IA deve aprender..."
              value={contextoIA}
              onChange={(e) => setContextoIA(e.target.value)}
              disabled={!modoTreinoAtivo}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dados-novos">Novos dados (opcional)</Label>
            <Textarea
              id="dados-novos"
              placeholder="Dados adicionais que a IA pode usar..."
              value={dadosIA}
              onChange={(e) => setDadosIA(e.target.value)}
              disabled={!modoTreinoAtivo}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações salvas</DialogTitle>
            <DialogDescription>
              As configurações foram registradas com sucesso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setModalAberto(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
