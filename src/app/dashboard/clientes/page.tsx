"use client";

import { useState } from "react";
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
import { trpc } from "@/utils/trpc";
import { format } from "date-fns";

export default function ClientesPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<
    string | null
  >(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalConfirmarDeleteAberto, setModalConfirmarDeleteAberto] =
    useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<
    typeof formData | null
  >(null);

  const {
    data: clientes,
    isLoading,
    error,
    refetch,
  } = trpc.cliente.listar.useQuery();
  const { data: clienteSelecionado } = trpc.cliente.getById.useQuery(
    clienteSelecionadoId ?? "",
    { enabled: !!clienteSelecionadoId },
  );

  const criarCliente = trpc.cliente.criar.useMutation({
    onSuccess: () => {
      setModalCriarAberto(false);
      refetch();
    },
  });

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    dataNascimento: "",
  });

  function abrirModal(id: string) {
    setClienteSelecionadoId(id);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setClienteSelecionadoId(null);
  }

  function handleCriarCliente() {
    criarCliente.mutate({
      nome: formData.nome,
      telefone: formData.telefone,
      email: formData.email || undefined,
      dataNascimento: formData.dataNascimento,
    });
  }

  const editarCliente = trpc.cliente.editar.useMutation({
    onSuccess: () => {
      setModalEditarAberto(false);
      refetch();
    },
  });

  const deletarCliente = trpc.cliente.deletar.useMutation({
    onSuccess: () => {
      setModalConfirmarDeleteAberto(false);
      setClienteSelecionadoId(null);
      refetch();
    },
  });

  if (isLoading) return <p>Carregando clientes...</p>;
  if (error) return <p>Erro ao carregar clientes: {error.message}</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <Button onClick={() => setModalCriarAberto(true)}>
          Adicionar Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Clientes</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          {clientes?.length ? (
            clientes.map((cliente) => (
              <Card key={cliente.id} className="border p-4 shadow-sm">
                <CardTitle className="text-base">{cliente.nome}</CardTitle>
                <CardDescription className="text-sm">
                  {cliente.email}
                </CardDescription>
                <div className="text-muted-foreground mb-2 text-sm">
                  {cliente.telefone}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => abrirModal(cliente.id)}
                  >
                    Ver detalhes
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFormData({
                        nome: cliente.nome,
                        telefone: cliente.telefone,
                        email: cliente.email ?? "",
                        dataNascimento: cliente.dataNascimento.split("T")[0], // YYYY-MM-DD
                      });
                      setClienteSelecionadoId(cliente.id);
                      setModalEditarAberto(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
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
            <p>Nenhum cliente encontrado.</p>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Fechar
              </Button>
            </DialogClose>
          </DialogHeader>

          {clienteSelecionado ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Nome completo</Label>
                <Input value={clienteSelecionado.nome} readOnly />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={clienteSelecionado.telefone} readOnly />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={clienteSelecionado.email ?? ""} readOnly />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input
                  value={
                    clienteSelecionado.dataNascimento
                      ? new Date(
                          clienteSelecionado.dataNascimento,
                        ).toLocaleDateString("pt-BR")
                      : ""
                  }
                  readOnly
                />
              </div>
            </div>
          ) : (
            <p>Carregando detalhes do cliente...</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Criação */}
      <Dialog open={modalCriarAberto} onOpenChange={setModalCriarAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Fechar
              </Button>
            </DialogClose>
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
                  setFormData({ ...formData, telefone: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Email (opcional)</Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Data de nascimento *</Label>
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
            <Button
              onClick={handleCriarCliente}
              disabled={criarCliente.isLoading}
            >
              {criarCliente.isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                Fechar
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Mesmos campos do modal de criação */}
            {/* Usando setFormData */}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                if (!clienteSelecionadoId) return;
                editarCliente.mutate({
                  id: clienteSelecionadoId,
                  ...formData,
                });
              }}
              disabled={editarCliente.isLoading}
            >
              {editarCliente.isLoading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modalConfirmarDeleteAberto}
        onOpenChange={setModalConfirmarDeleteAberto}
      >
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir este cliente? Esta ação não poderá
            ser desfeita.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setModalConfirmarDeleteAberto(false)}
            >
              Cancelar
            </Button>
            <Button
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
