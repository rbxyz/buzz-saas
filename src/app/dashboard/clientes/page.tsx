"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { trpc as trpcUntyped } from "@/utils/trpc";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Search, X } from "lucide-react";

// Explicit types for TRPC hooks
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

// Infer types for cliente and agendamento
type RouterOutput = inferRouterOutputs<AppRouter>;
type Cliente = RouterOutput["cliente"]["listar"][number];
type ClienteDetalhe = RouterOutput["cliente"]["buscarPorId"];
type HistoricoAgendamento =
  RouterOutput["agendamento"]["getHistoricoPorCliente"][number];

// Type-safe trpc - VOLTANDO À ESTRUTURA ORIGINAL
const trpc = trpcUntyped as unknown as {
  cliente: {
    listar: {
      useQuery: typeof trpcUntyped.cliente.listar.useQuery;
    };
    getById: {
      useQuery: typeof trpcUntyped.cliente.buscarPorId.useQuery;
    };
    criar: {
      useMutation: typeof trpcUntyped.cliente.criar.useMutation;
    };
    editar: {
      useMutation: typeof trpcUntyped.cliente.atualizar.useMutation;
    };
    deletar: {
      useMutation: typeof trpcUntyped.cliente.excluir.useMutation;
    };
  };
  agendamento: {
    getHistoricoPorCliente: {
      useQuery: typeof trpcUntyped.agendamento.getHistoricoPorCliente.useQuery;
    };
  };
};

export default function ClientesPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<
    string | null
  >(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalConfirmarDeleteAberto, setModalConfirmarDeleteAberto] =
    useState(false);
  const [termoBusca, setTermoBusca] = useState("");

  // VOLTANDO ÀS QUERIES ORIGINAIS
  const { data: clientes, refetch } = trpc.cliente.listar.useQuery(undefined, {
    // No options needed for cache-only
  });

  const { data: clienteSelecionado } = trpc.cliente.getById.useQuery(
    { id: clienteSelecionadoId ?? "" },
    {
      enabled: !!clienteSelecionadoId,
    },
  );

  // VOLTANDO ÀS MUTATIONS ORIGINAIS
  const criarCliente = trpc.cliente.criar.useMutation({
    onSuccess: async () => {
      setModalCriarAberto(false);
      toast.success("Cliente criado com sucesso!");
      await refetch();
    },
    onError: (error) => {
      console.error("Erro ao criar cliente:", error);
      toast.error(
        "Erro ao criar cliente. Verifique os dados e tente novamente.",
      );
    },
  });

  const editarCliente = trpc.cliente.editar.useMutation({
    onSuccess: async () => {
      setModalEditarAberto(false);
      toast.success("Cliente atualizado com sucesso!");
      await refetch();
    },
    onError: (error) => {
      console.error("Erro ao editar cliente:", error);
      toast.error(
        "Erro ao editar cliente. Verifique os dados e tente novamente.",
      );
    },
  });

  const deletarCliente = trpc.cliente.deletar.useMutation({
    onSuccess: async () => {
      setModalConfirmarDeleteAberto(false);
      setClienteSelecionadoId(null);
      toast.success("Cliente excluído com sucesso!");
      await refetch();
    },
    onError: (error) => {
      console.error("Erro ao deletar cliente:", error);
      toast.error("Erro ao excluir cliente. Tente novamente.");
    },
  });

  const { data: historico } = trpc.agendamento.getHistoricoPorCliente.useQuery(
    { clienteId: clienteSelecionadoId ?? "" },
    {
      enabled: !!clienteSelecionadoId,
    },
  );

  const [formData, setFormData] = useState<{
    nome: string;
    telefone: string;
    email: string;
    dataNascimento: string;
  }>({
    nome: "",
    telefone: "",
    email: "",
    dataNascimento: "",
  });

  // Função para filtrar clientes localmente
  const filtrarClientes = (termo: string, clientes: Cliente[]) => {
    if (!termo.trim()) return clientes;

    const termoLimpo = termo.toLowerCase().trim();

    return clientes.filter((cliente) => {
      // Buscar por nome
      const nomeMatch = cliente.nome.toLowerCase().includes(termoLimpo);

      // Buscar por telefone (remover formatação para comparar)
      const telefoneNumeros = cliente.telefone.replace(/\D/g, "");
      const termoNumeros = termo.replace(/\D/g, "");
      const telefoneMatch =
        telefoneNumeros.includes(termoNumeros) && termoNumeros.length >= 3;

      return nomeMatch || telefoneMatch;
    });
  };

  // Determinar quais clientes mostrar
  const clientesParaMostrar =
    termoBusca.trim() && Array.isArray(clientes)
      ? filtrarClientes(termoBusca, clientes)
      : (clientes ?? []);

  function mascararTelefone(valor: string) {
    const numeros = valor.replace(/\D/g, "");

    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 6) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }
    if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  }

  function abrirModal(id: string) {
    setClienteSelecionadoId(id);
    setModalAberto(true);
  }

  function handleCriarCliente() {
    criarCliente.mutate({
      nome: formData.nome,
      telefone: formData.telefone,
      email: formData.email.trim() === "" ? null : formData.email,
      dataNascimento:
        formData.dataNascimento.trim() === "" ? null : formData.dataNascimento,
    });
  }

  function handleEditarCliente() {
    if (!clienteSelecionadoId) return;
    editarCliente.mutate({
      id: clienteSelecionadoId,
      nome: formData.nome,
      telefone: formData.telefone,
      email: formData.email.trim() === "" ? null : formData.email,
      dataNascimento:
        formData.dataNascimento.trim() === "" ? null : formData.dataNascimento,
    });
  }

  function limparBusca() {
    setTermoBusca("");
  }

  useEffect(() => {
    if (clienteSelecionado && modalEditarAberto) {
      setFormData({
        nome:
          typeof clienteSelecionado.nome === "string"
            ? clienteSelecionado.nome
            : "",
        telefone:
          typeof clienteSelecionado.telefone === "string"
            ? clienteSelecionado.telefone
            : "",
        email:
          typeof clienteSelecionado.email === "string"
            ? clienteSelecionado.email
            : "",
        dataNascimento: clienteSelecionado.dataNascimento
          ? dayjs(
              clienteSelecionado.dataNascimento as string | number | Date,
            ).format("YYYY-MM-DD")
          : "",
      });
    }
  }, [clienteSelecionado, modalEditarAberto]);

  return (
    <div className="mx-auto flex w-full flex-col gap-6 px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">
          Clientes
        </h1>
        <Button
          className="cursor-pointer"
          onClick={() => setModalCriarAberto(true)}
        >
          Adicionar Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Clientes</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os seus clientes
          </CardDescription>

          {/* Campo de Busca */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pr-10 pl-10"
              />
              {termoBusca && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={limparBusca}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Indicador de resultados */}
          {termoBusca.trim() && (
            <div className="text-muted-foreground text-sm">
              {clientesParaMostrar.length === 0
                ? "Nenhum cliente encontrado"
                : `${clientesParaMostrar.length} cliente(s) encontrado(s)`}
            </div>
          )}
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.isArray(clientesParaMostrar) && clientesParaMostrar.length ? (
            clientesParaMostrar.map((cliente: Cliente) => (
              <Card
                key={cliente.id}
                className="border-border bg-card text-card-foreground border p-4 shadow-sm"
              >
                <CardTitle className="text-base">{cliente.nome}</CardTitle>
                <CardDescription className="text-sm">
                  {cliente.email ?? "Email não informado"}
                </CardDescription>
                <div className="text-muted-foreground mb-2 text-sm">
                  {cliente.telefone}
                </div>
                <div className="flex gap-2">
                  <Button
                    className="cursor-pointer"
                    variant="outline"
                    onClick={() => abrirModal(cliente.id)}
                  >
                    Ver detalhes
                  </Button>
                  <Button
                    className="cursor-pointer"
                    variant="secondary"
                    onClick={() => {
                      setClienteSelecionadoId(cliente.id);
                      setModalEditarAberto(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    className="cursor-pointer"
                    variant="destructive"
                    onClick={() => {
                      setClienteSelecionadoId(cliente.id);
                      setModalConfirmarDeleteAberto(true);
                    }}
                  >
                    Deletar
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-8 text-center">
              <p className="text-muted-foreground">
                {termoBusca.trim()
                  ? "Nenhum cliente encontrado com esse termo de busca."
                  : "Nenhum cliente encontrado."}
              </p>
              {termoBusca.trim() && (
                <Button
                  variant="outline"
                  onClick={limparBusca}
                  className="mt-2"
                >
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="border-border bg-card text-card-foreground max-w-lg border backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>

          {clienteSelecionado ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Nome completo</Label>
                <Input
                  value={
                    typeof clienteSelecionado.nome === "string"
                      ? clienteSelecionado.nome
                      : ""
                  }
                  readOnly
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={
                    typeof clienteSelecionado.telefone === "string"
                      ? clienteSelecionado.telefone
                      : ""
                  }
                  readOnly
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={
                    typeof clienteSelecionado.email === "string"
                      ? clienteSelecionado.email
                      : "Não informado"
                  }
                  readOnly
                />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input
                  value={
                    clienteSelecionado.dataNascimento
                      ? dayjs(
                          clienteSelecionado.dataNascimento as
                            | string
                            | number
                            | Date,
                        ).format("DD/MM/YYYY")
                      : "Não informado"
                  }
                  readOnly
                />
              </div>

              <div className="col-span-2 mt-2">
                <Label>Histórico de Agendamentos</Label>
                {Array.isArray(historico) && historico.length === 0 ? (
                  <p className="text-muted-foreground">
                    Nenhum serviço registrado ainda.
                  </p>
                ) : (
                  <ul className="text-muted-foreground list-disc pl-5 text-sm">
                    {Array.isArray(historico) &&
                      historico.map((h: HistoricoAgendamento) => (
                        <li key={h.id}>
                          {dayjs(h.dataHora).format("DD/MM/YYYY HH:mm")} –{" "}
                          {h.servico} ({h.status})
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Carregando detalhes do cliente...
            </p>
          )}
          <DialogClose asChild>
            <Button className="cursor-pointer" variant="outline" size="sm">
              Fechar
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação */}
      <Dialog
        open={modalCriarAberto}
        onOpenChange={(open) => {
          setModalCriarAberto(open);
          if (!open) {
            setFormData({
              nome: "",
              telefone: "",
              email: "",
              dataNascimento: "",
            });
          }
        }}
      >
        <DialogContent className="border-border bg-card text-card-foreground max-w-lg border backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Nome completo *</Label>
              <Input
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telefone: mascararTelefone(e.target.value),
                  })
                }
                maxLength={15}
              />
            </div>
            <div>
              <Label>Email (opcional)</Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="exemplo@email.com"
              />
            </div>
            <div>
              <Label>Data de nascimento (opcional)</Label>
              <Input
                type="date"
                value={formData.dataNascimento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dataNascimento: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button className="mr-4 cursor-pointer" variant="ghost" size="sm">
                Fechar
              </Button>
            </DialogClose>
            <Button
              className="cursor-pointer"
              onClick={handleCriarCliente}
              disabled={
                !formData.nome || !formData.telefone || criarCliente.isPending
              }
            >
              {criarCliente.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="border-border bg-card text-card-foreground max-w-lg border backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Nome completo *</Label>
              <Input
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telefone: mascararTelefone(e.target.value),
                  })
                }
                maxLength={15}
              />
            </div>
            <div>
              <Label>Email (opcional)</Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="exemplo@email.com"
              />
            </div>
            <div>
              <Label>Data de nascimento (opcional)</Label>
              <Input
                type="date"
                value={formData.dataNascimento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dataNascimento: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button className="mr-4 cursor-pointer" variant="ghost" size="sm">
                Fechar
              </Button>
            </DialogClose>

            <Button
              className="cursor-pointer"
              onClick={handleEditarCliente}
              disabled={
                !formData.nome || !formData.telefone || editarCliente.isPending
              }
            >
              {editarCliente.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalConfirmarDeleteAberto}
        onOpenChange={setModalConfirmarDeleteAberto}
      >
        <DialogContent className="border-border bg-card text-card-foreground max-w-lg border backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
          </DialogHeader>
          <p className="text-foreground">
            Tem certeza que deseja excluir este cliente? Esta ação não poderá
            ser desfeita.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => setModalConfirmarDeleteAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              className="cursor-pointer"
              variant="destructive"
              onClick={() => {
                if (!clienteSelecionadoId) return;
                deletarCliente.mutate({ id: clienteSelecionadoId });
              }}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
