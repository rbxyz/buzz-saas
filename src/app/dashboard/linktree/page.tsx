"use client";

import type React from "react";

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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { toast } from "sonner";

import { Menu, MenuItem } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";

interface LinkItem {
  id: string;
  titulo: string;
  url: string;
  descricao?: string;
  tipo: "cliente" | "parceria";
  imagem?: string | null;
  mimeType?: string;
}

export default function LinktreePage() {
  const utils = api.useContext();
  const { data: links = [], isLoading } = api.linktree.listar.useQuery();

  // Estados para criação/edição
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "parceria" | "">("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Controle dos modais
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deletarId, setDeletarId] = useState<string | null>(null);

  // Mutations
  const adicionarLink = api.linktree.criar.useMutation({
    onSuccess() {
      toast.success("Link adicionado com sucesso!");
      utils.linktree.listar.invalidate();
      limparCampos();
      setOpenModal(false);
    },
    onError(error) {
      toast.error("Erro ao adicionar link: " + error.message);
    },
  });

  const editarLink = api.linktree.editar.useMutation({
    onSuccess() {
      toast.success("Link editado com sucesso!");
      utils.linktree.listar.invalidate();
      limparCampos();
      setEditandoId(null);
      setOpenModal(false);
    },
    onError(error) {
      toast.error("Erro ao editar link: " + error.message);
    },
  });

  const deletarLink = api.linktree.deletar.useMutation({
    onSuccess() {
      toast.success("Link deletado com sucesso!");
      utils.linktree.listar.invalidate();
      setDeletarId(null);
      setOpenDeleteModal(false);
    },
    onError() {
      toast.error("Erro ao deletar link.");
    },
  });

  function limparCampos() {
    setTitulo("");
    setUrl("");
    setDescricao("");
    setTipo("");
    setImagem(null);
    setEditandoId(null);
  }

  function handleImagemUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 5MB.");
        return;
      }

      // Validar tipo do arquivo
      if (!file.type.startsWith("image/")) {
        toast.error("Arquivo deve ser uma imagem.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagem(reader.result as string);
        console.log("Imagem carregada:", file.name, file.size, "bytes");
      };
      reader.onerror = () => {
        toast.error("Erro ao carregar imagem.");
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit() {
    if (!titulo.trim() || !tipo) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (tipo === "parceria" && !url.trim()) {
      toast.error("URL é obrigatória para parcerias.");
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      // Para clientes, não enviamos URL (undefined)
      // Para parcerias, enviamos a URL se fornecida
      url: tipo === "parceria" ? url.trim() : undefined,
      descricao: descricao.trim() || undefined,
      tipo,
      imagem: imagem ?? undefined,
    };

    console.log("Enviando payload:", {
      ...payload,
      imagem: imagem ? "imagem presente" : "sem imagem",
    });

    if (editandoId) {
      editarLink.mutate({ id: editandoId, ...payload });
    } else {
      adicionarLink.mutate(payload);
    }
  }

  function abrirEditar(link: LinkItem) {
    setEditandoId(link.id);
    setTitulo(link.titulo);
    setUrl(link.url || "");
    setDescricao(link.descricao || "");
    setTipo(link.tipo);

    // Reconstrói a data URL se há imagem
    if (link.imagem && link.mimeType) {
      setImagem(`data:${link.mimeType};base64,${link.imagem}`);
    } else {
      setImagem(null);
    }

    setOpenModal(true);
  }

  function abrirDeletar(id: string) {
    setDeletarId(id);
    setOpenDeleteModal(true);
  }

  const clientes = links.filter((link) => link.tipo === "cliente");
  const parcerias = links.filter((link) => link.tipo === "parceria");

  if (isLoading) {
    return (
      <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="border-border flex items-center gap-3 rounded-lg border bg-white px-6 py-4 shadow-xl dark:bg-zinc-900">
          <div className="border-muted border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
          <span className="text-foreground text-sm font-medium">
            Carregando clientes e parceiros...
          </span>
        </div>
      </div>
    );
  }

  return (
    <main
      className="animate-fade-in mx-auto flex w-full flex-col gap-6 px-4 md:px-6 lg:px-8"
      style={{
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h1 className="text-3xl font-bold tracking-tight">Linktree Manager</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciar Links</CardTitle>
            <CardDescription className="text-[hsl(var(--foreground)/0.7)]">
              Adicione seus clientes e parceiros que aparecerão na sua página
              pública.
            </CardDescription>
          </div>

          <Dialog
            open={openModal}
            onOpenChange={(open) => {
              setOpenModal(open);
              if (!open) limparCampos();
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-border hover:text-accent-foreground flex cursor-pointer items-center border transition-colors"
              >
                Adicionar
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editandoId ? "Editar Link" : "Novo Link"}
                </DialogTitle>
              </DialogHeader>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={tipo}
                    onValueChange={(value) =>
                      setTipo(value as "cliente" | "parceria")
                    }
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="parceria">Parceria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="titulo">
                    {tipo === "cliente" ? "Nome do cliente" : "Título"}
                  </Label>
                  <Input
                    id="titulo"
                    placeholder={
                      tipo === "cliente"
                        ? "Nome do cliente aqui"
                        : "Ex: Loja Exemplo"
                    }
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                </div>

                {tipo === "parceria" && (
                  <div>
                    <Label htmlFor="url">URL *</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    placeholder="Uma breve descrição..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="imagem">Imagem (máximo 5MB)</Label>
                  <Input
                    id="imagem"
                    type="file"
                    accept="image/*"
                    onChange={handleImagemUpload}
                  />
                  {imagem && (
                    <div className="relative mt-2 inline-block">
                      <img
                        src={imagem || "/placeholder.svg"}
                        alt="Prévia da imagem"
                        className="h-20 w-20 rounded border-2 border-gray-300 object-cover"
                        onError={(e) => {
                          console.error("Erro ao exibir prévia da imagem");
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setImagem(null)}
                        aria-label="Remover imagem"
                        className="absolute -top-2 -right-2 cursor-pointer rounded-full bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full cursor-pointer"
                  disabled={adicionarLink.isLoading || editarLink.isLoading}
                >
                  {adicionarLink.isLoading || editarLink.isLoading
                    ? "Salvando..."
                    : editandoId
                      ? "Salvar alterações"
                      : "Adicionar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="grid gap-6 md:grid-cols-2">
          {[
            ["Clientes", clientes],
            ["Parcerias", parcerias],
          ].map(([tituloSecao, lista]) => (
            <section key={tituloSecao as string}>
              <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--foreground))]">
                {tituloSecao}
              </h2>

              {lista.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum {tituloSecao.toLowerCase()} adicionado.
                </p>
              ) : (
                <div className="space-y-3">
                  {lista.map((link: LinkItem) => (
                    <Card
                      key={link.id}
                      className="group relative flex flex-row items-center gap-4 border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] p-4 text-[hsl(var(--sidebar-foreground))] transition-colors hover:bg-[hsl(var(--accent)/0.15)]"
                    >
                      <div className="flex-shrink-0">
                        {link.imagem && link.mimeType ? (
                          <img
                            src={`data:${link.mimeType};base64,${link.imagem}`}
                            alt={`Imagem de ${link.titulo}`}
                            className="h-16 w-16 rounded border-2 border-gray-300 object-cover"
                            onError={(e) => {
                              console.error(
                                "Erro ao carregar imagem:",
                                link.titulo,
                              );
                              e.currentTarget.style.display = "none";
                            }}
                            onLoad={() => {
                              console.log(
                                "Imagem carregada com sucesso:",
                                link.titulo,
                              );
                            }}
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-200 text-xs text-gray-500">
                            Sem imagem
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-grow flex-col">
                        <p className="truncate font-semibold">{link.titulo}</p>
                        {link.descricao && (
                          <p className="text-muted-foreground truncate text-sm">
                            {link.descricao}
                          </p>
                        )}
                        {link.url && (
                          <p className="text-primary truncate text-xs underline">
                            {link.url}
                          </p>
                        )}
                      </div>

                      {/* Botão 3 bolinhas com menu */}
                      <Menu
                        menuButton={
                          <Button
                            variant="ghost"
                            className="ml-auto h-8 w-8 flex-shrink-0 p-0 text-xl font-bold"
                            aria-label="Ações do link"
                          >
                            ⋮
                          </Button>
                        }
                        arrow
                        align="end"
                        theming="dark"
                        transition
                      >
                        <MenuItem onClick={() => abrirEditar(link)}>
                          Editar
                        </MenuItem>
                        <MenuItem onClick={() => abrirDeletar(link.id)}>
                          Deletar
                        </MenuItem>
                      </Menu>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ))}
        </CardContent>

        {/* Modal de confirmação de exclusão */}
        <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>

            <p>Tem certeza que deseja deletar este link?</p>

            <div className="mt-4 flex justify-end gap-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeletarId(null);
                    setOpenDeleteModal(false);
                  }}
                >
                  Cancelar
                </Button>
              </DialogClose>

              <Button
                variant="destructive"
                onClick={() => {
                  if (deletarId) deletarLink.mutate(deletarId);
                }}
                disabled={deletarLink.isLoading}
              >
                {deletarLink.isLoading ? "Deletando..." : "Deletar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </main>
  );
}
