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
import Image from "next/image";
import { Menu, MenuItem } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";

interface LinkItem {
  id: string;
  titulo: string;
  url: string | null;
  descricao: string | null;
  tipo: "cliente" | "parceria";
  imagem: string | null;
  mimeType: string | null;
}

export default function LinktreePage() {
  const utils = api.useContext();
  // Apenas consome dados já em cache (sem loading states)
  const { data: links, isLoading, isError } = api.linktree.listar.useQuery();

  // Estados para criação/edição
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"parceria" | "">("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Controle dos modais
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deletarId, setDeletarId] = useState<string | null>(null);

  // Mutations
  const adicionarLink = api.linktree.criar.useMutation({
    onSuccess: async () => {
      toast.success("Link adicionado com sucesso!");
      await utils.linktree.listar.invalidate();
      limparCampos();
      setOpenModal(false);
    },
    onError(error) {
      toast.error("Erro ao adicionar link: " + error.message);
    },
  });

  const editarLink = api.linktree.editar.useMutation({
    onSuccess: async () => {
      toast.success("Link editado com sucesso!");
      await utils.linktree.listar.invalidate();
      limparCampos();
      setEditandoId(null);
      setOpenModal(false);
    },
    onError(error) {
      toast.error("Erro ao editar link: " + error.message);
    },
  });

  const deletarLink = api.linktree.deletar.useMutation({
    onSuccess: async () => {
      toast.success("Link deletado com sucesso!");
      await utils.linktree.listar.invalidate();
      setDeletarId(null);
      setOpenDeleteModal(false);
    },
    onError() {
      toast.error("Erro ao deletar link.");
    },
  });

  const isSalvando =
    adicionarLink.status === "pending" || editarLink.status === "pending";

  const isDeletando = deletarLink.status === "pending";

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
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 5MB.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Arquivo deve ser uma imagem.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagem(reader.result as string);
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
      url: tipo === "parceria" ? url.trim() : undefined,
      descricao: descricao.trim() || undefined,
      tipo,
      imagem: imagem ?? undefined,
    };

    if (editandoId) {
      editarLink.mutate({ id: editandoId, ...payload });
    } else {
      adicionarLink.mutate(payload);
    }
  }

  function abrirEditar(link: LinkItem) {
    setEditandoId(link.id);
    setTitulo(link.titulo);
    setUrl(link.url ?? "");
    setDescricao(link.descricao ?? "");
    setTipo(link.tipo === "parceria" ? "parceria" : "");

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

  function renderSecaoConteudo(
    titulo: string,
    lista: LinkItem[],
    isLoading: boolean,
  ) {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="border-border bg-card flex flex-row items-center gap-4 border p-4"
            >
              <div className="flex-shrink-0">
                <div className="bg-muted h-16 w-16 animate-pulse rounded" />
              </div>
              <div className="flex min-w-0 flex-grow flex-col space-y-2">
                <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                <div className="bg-muted h-3 w-40 animate-pulse rounded" />
                <div className="bg-muted h-3 w-28 animate-pulse rounded" />
              </div>
              <div className="bg-muted h-8 w-8 flex-shrink-0 animate-pulse rounded" />
            </Card>
          ))}
        </div>
      );
    }

    if (lista.length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          Nenhum {titulo.toLowerCase()} adicionado.
        </p>
      );
    }

    return (
      <div className="w-full space-y-3 overflow-hidden">
        {lista.map((link: LinkItem) => (
          <Card
            key={link.id}
            className="group border-border bg-card text-card-foreground hover:bg-accent/15 relative flex w-full max-w-full flex-row items-center gap-3 overflow-hidden border p-3 transition-colors"
          >
            <div className="flex-shrink-0">
              {link.imagem ? (
                <Image
                  src={`data:image/png;base64,${link.imagem}`}
                  alt={`Imagem de ${link.titulo}`}
                  width={48}
                  height={48}
                  className="border-muted h-12 w-12 rounded border-2 object-cover"
                  onError={(e) => {
                    console.error("Erro ao carregar imagem:", e);
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="bg-muted text-muted-foreground flex h-12 w-12 flex-shrink-0 items-center justify-center rounded text-xs">
                  Sem imagem
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-grow flex-col overflow-hidden">
              <p className="text-foreground truncate text-sm font-semibold">
                {link.titulo}
              </p>
              {link.descricao && (
                <p className="text-muted-foreground truncate text-xs">
                  {link.descricao}
                </p>
              )}
              {link.url && (
                <p className="text-primary truncate text-xs underline">
                  {link.url}
                </p>
              )}
            </div>

            <Menu
              menuButton={
                <Button
                  variant="ghost"
                  className="ml-auto h-8 w-8 flex-shrink-0 p-0 text-lg font-bold"
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
              <MenuItem onClick={() => abrirEditar(link)}>Editar</MenuItem>
              <MenuItem onClick={() => abrirDeletar(link.id)}>Deletar</MenuItem>
            </Menu>
          </Card>
        ))}
      </div>
    );
  }

  const parcerias = links?.filter((link) => link.tipo === "parceria") ?? [];

  return (
    <main className="mx-auto flex w-full flex-col gap-6 px-4 md:px-6 lg:px-8">
      <h1 className="text-foreground text-3xl font-bold tracking-tight">
        Linktree Manager
      </h1>
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300">
          <p className="font-medium">Erro ao carregar links</p>
          <p className="text-sm">
            Tente recarregar a página ou entre em contato com o suporte.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciar Links</CardTitle>
            <CardDescription>
              Adicione seus parceiros que aparecerão na sua página pública.
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
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center border transition-colors"
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
                      setTipo(value as "parceria")
                    }
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="cursor-pointer bg-black/40 backdrop-blur-sm">
                      <SelectItem value="parceria">Parceria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    placeholder="Ex: Loja Exemplo"
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
                      <Image
                        src={imagem || "/placeholder.svg"}
                        alt="Prévia da imagem"
                        width={80}
                        height={80}
                        className="border-muted h-20 w-20 rounded border-2 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
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
                  disabled={isSalvando}
                >
                  {isSalvando
                    ? "Salvando..."
                    : editandoId
                      ? "Salvar alterações"
                      : "Adicionar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="w-full overflow-hidden">
          <section className="w-full min-w-0 overflow-hidden">
            <h2 className="text-foreground mb-4 text-lg font-semibold">
              Parcerias
            </h2>
            {renderSecaoConteudo("Parcerias", parcerias, isLoading)}
          </section>
        </CardContent>

        {/* Modal de confirmação de exclusão */}
        <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>

            <p className="text-foreground">
              Tem certeza que deseja deletar este link?
            </p>

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
                disabled={isDeletando}
              >
                {isDeletando ? "Deletando..." : "Deletar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </main>
  );
}
