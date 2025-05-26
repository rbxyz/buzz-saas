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
import { trpc } from "@/utils/trpc";
import dayjs from "dayjs";

export default function ClientesPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<
    string | null
  >(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalConfirmarDeleteAberto, setModalConfirmarDeleteAberto] =
    useState(false);

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

  const { data: historico, isLoading: isHistoricoLoading } =
    trpc.agendamento.getHistoricoPorCliente.useQuery(
      { clienteId: clienteSelecionadoId ?? "" },
      {
        enabled: !!clienteSelecionadoId,
      },
    );

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    dataNascimento: "",
  });

  // Função para mascarar telefone no padrão brasileiro (ex: (12) 34567-8901)
  function mascararTelefone(valor: string) {
    const numeros = valor.replace(/\D/g, "");

    if (numeros.length <= 2) return numeros; // só DDD incompleto
    if (numeros.length <= 6) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }
    if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }

    // (99) 99999-9999 para celulares com 9 dígitos
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  }

  function abrirModal(id: string) {
    setClienteSelecionadoId(id);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setClienteSelecionadoId(null);
  }

  function limparEmail(email: string) {
    const trimmed = email.trim();
    return trimmed === "" ? "" : trimmed;
  }

  function handleCriarCliente() {
    criarCliente.mutate({
      nome: formData.nome,
      telefone: formData.telefone,
      email: limparEmail(formData.email),
      dataNascimento: formData.dataNascimento,
    });
  }

  useEffect(() => {
    if (clienteSelecionado && modalEditarAberto) {
      setFormData({
        nome: clienteSelecionado.nome ?? "",
        telefone: clienteSelecionado.telefone ?? "",
        email: clienteSelecionado.email ?? "",
        dataNascimento: clienteSelecionado.dataNascimento
          ? new Date(clienteSelecionado.dataNascimento)
              .toISOString()
              .split("T")[0]
          : "",
      });
    }
  }, [clienteSelecionado, modalEditarAberto]);

  if (isLoading) {
    return (
      <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="border-border flex items-center gap-3 rounded-lg border bg-white px-6 py-4 shadow-xl dark:bg-zinc-900">
          <div className="border-muted border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
          <span className="text-foreground text-sm font-medium">
            Carregando clientes...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in mx-auto flex w-full flex-col gap-6 px-4 md:px-6 lg:px-8"
      style={{
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
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
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {clientes?.length ? (
            clientes.map((cliente) => (
              <Card
                key={cliente.id}
                className="border-border bg-card text-card-foreground border p-4 shadow-sm"
              >
                <CardTitle className="text-base">{cliente.nome}</CardTitle>
                <CardDescription className="text-sm">
                  {cliente.email}
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
            <p>Nenhum cliente encontrado.</p>
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
                <Input value={clienteSelecionado?.nome ?? ""} readOnly />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={clienteSelecionado?.telefone ?? ""} readOnly />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={clienteSelecionado?.email ?? ""} readOnly />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input
                  value={
                    clienteSelecionado?.dataNascimento
                      ? dayjs(clienteSelecionado.dataNascimento).format(
                          "DD/MM/YYYY",
                        )
                      : ""
                  }
                  readOnly
                />
              </div>

              <div className="col-span-2 mt-2">
                <Label>Histórico de Agendamentos</Label>
                {isHistoricoLoading ? (
                  <p>Carregando histórico...</p>
                ) : historico?.length === 0 ? (
                  <p>Nenhum serviço registrado ainda.</p>
                ) : (
                  <ul className="text-muted-foreground list-disc pl-5 text-sm">
                    {historico?.map((h) => (
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
            <p>Carregando detalhes do cliente...</p>
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
            // Limpa os campos ao fechar o modal
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
              <Label>Telefone (opcional)</Label>
              <Input
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telefone: mascararTelefone(e.target.value),
                  })
                }
                maxLength={15} // máximo para (99) 99999-9999
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
            <DialogClose asChild>
              <Button className="mr-4 cursor-pointer" variant="ghost" size="sm">
                Fechar
              </Button>
            </DialogClose>
            <Button
              className="cursor-pointer"
              onClick={handleCriarCliente}
              disabled={!formData.nome || criarCliente.isLoading}
            >
              {criarCliente.isLoading ? "Salvando..." : "Salvar"}
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
              <Label>Telefone (opcional)</Label>
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
            <DialogClose asChild>
              <Button className="mr-4 cursor-pointer" variant="ghost" size="sm">
                Fechar
              </Button>
            </DialogClose>

            <Button
              className="cursor-pointer"
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
        <DialogContent className="border-border bg-card text-card-foreground max-w-lg border backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
          </DialogHeader>
          <p>
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
