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
import { api } from "@/trpc/react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Search, X } from "lucide-react";

// Definindo tipos baseados na estrutura real da tabela
interface Cliente {
  id: number;
  userId: number;
  nome: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FormData {
  nome: string;
  telefone: string;
  email: string;
}

export default function ClientesPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<
    number | null
  >(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalConfirmarDeleteAberto, setModalConfirmarDeleteAberto] =
    useState(false);
  const [termoBusca, setTermoBusca] = useState("");

  const utils = api.useContext();

  // Queries
  const { data: clientes, isLoading } = api.cliente.listar.useQuery();

  const { data: clienteSelecionado } = api.cliente.buscarPorId.useQuery(
    { id: clienteSelecionadoId ?? 0 },
    {
      enabled: !!clienteSelecionadoId,
    },
  );

  // Mutations
  const criarCliente = api.cliente.criar.useMutation({
    onSuccess: async () => {
      setModalCriarAberto(false);
      toast.success("Cliente criado com sucesso!", {
        description: `${formData.nome} foi adicionado à sua lista de clientes.`,
        duration: 4000,
        action: {
          label: "Ver cliente",
          onClick: () => {
            // Buscar o cliente recém-criado e abrir seus detalhes
            const novoCliente = clientes?.find((c) => c.nome === formData.nome);
            if (novoCliente) {
              abrirModal(novoCliente.id);
            }
          },
        },
      });
      await utils.cliente.listar.invalidate();
      limparFormData();
    },
    onError: (error) => {
      console.error("Erro ao criar cliente:", error);

      // Tratamento específico para erro de telefone duplicado
      if (error.message === "TELEFONE_DUPLICADO") {
        toast.error("📱 Telefone já cadastrado!", {
          description: `O número ${formData.telefone} já está sendo usado por outro cliente.`,
          duration: 6000,
          action: {
            label: "🔍 Buscar cliente",
            onClick: () => {
              utils.cliente.buscarPorTelefone.fetch({
                    telefone: formData.telefone,
                  }).then(clienteExistente => {
                if (clienteExistente) {
                  setModalCriarAberto(false);
                  abrirModal(clienteExistente.id);
                  toast.info("Cliente encontrado!", {
                    description: `Mostrando detalhes de ${clienteExistente.nome}`,
                    duration: 3000,
                  });
                }
              }).catch(err => {
                console.error("Erro ao buscar cliente:", err);
                toast.error("Erro ao buscar cliente existente");
              })
            },
          },
        });
      } else if (error.message.includes("email")) {
        toast.error("📧 Email inválido", {
          description:
            "Por favor, verifique o formato do email e tente novamente.",
          duration: 4000,
        });
      } else if (error.message.includes("nome")) {
        toast.error("👤 Nome inválido", {
          description: "O nome deve ter pelo menos 2 caracteres.",
          duration: 4000,
        });
      } else {
        toast.error("❌ Erro ao criar cliente", {
          description:
            "Ocorreu um problema inesperado. Tente novamente em alguns instantes.",
          duration: 5000,
          action: {
            label: "🔄 Tentar novamente",
            onClick: () => handleCriarCliente(),
          },
        });
      }
    },
  });

  const editarCliente = api.cliente.atualizar.useMutation({
    onSuccess: async () => {
      setModalEditarAberto(false);
      toast.success("✅ Cliente atualizado!", {
        description: `As informações de ${formData.nome} foram salvas com sucesso.`,
        duration: 4000,
        action: {
          label: "👁️ Ver detalhes",
          onClick: () => {
            if (clienteSelecionadoId) {
              abrirModal(clienteSelecionadoId);
            }
          },
        },
      });
      await utils.cliente.listar.invalidate();
      limparFormData();
    },
    onError: (error) => {
      console.error("Erro ao editar cliente:", error);

      if (error.message === "TELEFONE_DUPLICADO") {
        toast.error("📱 Telefone já em uso!", {
          description: `O número ${formData.telefone} já está cadastrado para outro cliente.`,
          duration: 6000,
          action: {
            label: "↩️ Manter atual",
            onClick: () => {
              if (clienteSelecionado) {
                setFormData((prev) => ({
                  ...prev,
                  telefone: clienteSelecionado.telefone,
                }));
                toast.info("Telefone restaurado", {
                  description:
                    "O telefone foi restaurado para o valor anterior.",
                  duration: 2000,
                });
              }
            },
          },
        });
      } else {
        toast.error("❌ Erro ao atualizar", {
          description:
            "Não foi possível salvar as alterações. Verifique os dados e tente novamente.",
          duration: 4000,
          action: {
            label: "🔄 Tentar novamente",
            onClick: () => handleEditarCliente(),
          },
        });
      }
    },
  });

  const deletarCliente = api.cliente.excluir.useMutation({
    onSuccess: async () => {
      const nomeCliente = clienteSelecionado?.nome ?? "Cliente";
      setModalConfirmarDeleteAberto(false);
      setClienteSelecionadoId(null);

      toast.success("🗑️ Cliente excluído", {
        description: `${nomeCliente} foi removido da sua lista de clientes.`,
        duration: 5000,
        action: {
          label: "↩️ Desfazer",
          onClick: () => {
            toast.info("🚧 Funcionalidade em desenvolvimento", {
              description:
                "A opção de desfazer exclusão estará disponível em breve.",
              duration: 3000,
            });
          },
        },
      });
      await utils.cliente.listar.invalidate();
    },
    onError: (error) => {
      console.error("Erro ao deletar cliente:", error);

      if (error.message === "CLIENTE_COM_AGENDAMENTOS") {
        toast.error("⚠️ Não é possível excluir", {
          description:
            "Este cliente possui agendamentos vinculados. Cancele os agendamentos primeiro.",
          duration: 6000,
          action: {
            label: "📅 Ver agendamentos",
            onClick: () => {
              // Navegar para página de agendamentos filtrada por este cliente
              window.location.href = `/dashboard/agendamentos?cliente=${clienteSelecionadoId}`;
            },
          },
        });
      } else {
        toast.error("❌ Erro ao excluir", {
          description: "Não foi possível excluir o cliente. Tente novamente.",
          duration: 4000,
          action: {
            label: "🔄 Tentar novamente",
            onClick: () => {
              if (clienteSelecionadoId) {
                deletarCliente.mutate({ id: clienteSelecionadoId });
              }
            },
          },
        });
      }
    },
  });

  const [formData, setFormData] = useState<FormData>({
    nome: "",
    telefone: "",
    email: "",
  });

  function limparFormData() {
    setFormData({
      nome: "",
      telefone: "",
      email: "",
    });
  }

  // Função para filtrar clientes
  const filtrarClientes = (
    termo: string,
    clientesLista: Cliente[],
  ): Cliente[] => {
    if (!termo.trim()) return clientesLista;

    const termoLimpo = termo.toLowerCase().trim();

    return clientesLista.filter((cliente: Cliente) => {
      const nomeMatch =
        cliente.nome?.toLowerCase().includes(termoLimpo) ?? false;
      const telefoneNumeros = cliente.telefone?.replace(/\D/g, "") ?? "";
      const termoNumeros = termo.replace(/\D/g, "");
      const telefoneMatch =
        telefoneNumeros.includes(termoNumeros) && termoNumeros.length >= 3;

      return nomeMatch || telefoneMatch;
    });
  };

  const clientesParaMostrar: Cliente[] =
    termoBusca.trim() && clientes
      ? filtrarClientes(termoBusca, clientes as Cliente[])
      : ((clientes as Cliente[]) ?? []);

  function mascararTelefone(valor: string): string {
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

  function abrirModal(id: number) {
    setClienteSelecionadoId(id);
    setModalAberto(true);
  }

  function handleCriarCliente() {
    console.log("🚀 Tentando criar cliente com dados:", formData);
    criarCliente.mutate({
      nome: formData.nome,
      telefone: formData.telefone,
      email: formData.email.trim() === "" ? null : formData.email,
    });
  }

  function handleEditarCliente() {
    if (!clienteSelecionadoId) return;
    editarCliente.mutate({
      id: clienteSelecionadoId,
      nome: formData.nome,
      telefone: formData.telefone,
      email: formData.email.trim() === "" ? null : formData.email,
    });
  }

  function limparBusca() {
    setTermoBusca("");
  }

  // Função melhorada para validar e criar cliente
  function validarECriarCliente() {
    // Validações básicas
    if (!formData.nome.trim()) {
      toast.error("👤 Nome obrigatório", {
        description: "Por favor, informe o nome completo do cliente.",
        duration: 3000,
      });
      return;
    }

    if (!formData.telefone.trim()) {
      toast.error("📱 Telefone obrigatório", {
        description: "Por favor, informe o número de telefone do cliente.",
        duration: 3000,
      });
      return;
    }

    if (formData.telefone.replace(/\D/g, "").length < 10) {
      toast.error("📱 Telefone inválido", {
        description: "O telefone deve ter pelo menos 10 dígitos.",
        duration: 3000,
      });
      return;
    }

    // Validação de email se fornecido
    if (formData.email.trim() && !formData.email.includes("@")) {
      toast.error("📧 Email inválido", {
        description: "Por favor, informe um email válido ou deixe em branco.",
        duration: 3000,
      });
      return;
    }

    // Toast informativo durante a criação
    toast.loading("⏳ Criando cliente...", {
      description: `Adicionando ${formData.nome} à sua lista de clientes.`,
      duration: 2000,
    });

    handleCriarCliente();
  }

  useEffect(() => {
    if (clienteSelecionado && modalEditarAberto) {
      setFormData({
        nome: clienteSelecionado.nome ?? "",
        telefone: clienteSelecionado.telefone ?? "",
        email: clienteSelecionado.email ?? "",
      });
    }
  }, [clienteSelecionado, modalEditarAberto]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full flex-col gap-6 px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Clientes
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Carregando clientes...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="border-border bg-card p-4 shadow-sm">
                  <div className="mb-2 h-4 animate-pulse rounded bg-gray-200"></div>
                  <div className="mb-2 h-3 animate-pulse rounded bg-gray-200"></div>
                  <div className="mb-4 h-3 animate-pulse rounded bg-gray-200"></div>
                  <div className="flex gap-2">
                    <div className="h-8 flex-1 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-8 flex-1 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-8 flex-1 animate-pulse rounded bg-gray-200"></div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          {clientesParaMostrar.length > 0 ? (
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
                <Input value={clienteSelecionado.nome ?? ""} readOnly />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={clienteSelecionado.telefone ?? ""} readOnly />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={clienteSelecionado.email ?? "Não informado"}
                  readOnly
                />
              </div>
              <div>
                <Label>Data de cadastro</Label>
                <Input
                  value={
                    clienteSelecionado.createdAt
                      ? dayjs(clienteSelecionado.createdAt).format(
                          "DD/MM/YYYY HH:mm",
                        )
                      : ""
                  }
                  readOnly
                />
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
            limparFormData();
          }
        }}
      >
        <DialogContent className="border-border bg-card text-card-foreground max-w-lg border backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
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
          </div>
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button className="mr-4 cursor-pointer" variant="ghost" size="sm">
                Fechar
              </Button>
            </DialogClose>
            <Button
              className="cursor-pointer"
              onClick={validarECriarCliente}
              disabled={
                !formData.nome || !formData.telefone || criarCliente.isPending
              }
            >
              {criarCliente.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="border-border bg-card text-card-foreground max-w-lg border backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
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

      {/* Modal de Confirmação de Exclusão */}
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
