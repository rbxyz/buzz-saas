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
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

import { Menu, MenuItem, MenuButton } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css"; // estilos básicos para o menu

export default function LinktreePage() {
  const utils = trpc.useUtils();
  const { data: links = [], isLoading } = trpc.linktree.listar.useQuery();

  // Estados para criação/edição
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "parceria" | "">("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Estado para controle dos modais
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deletarId, setDeletarId] = useState<string | null>(null);

  // Mutations
  const adicionarLink = trpc.linktree.criar.useMutation({
    onSuccess: () => {
      toast.success("Link adicionado com sucesso!");
      utils.linktree.listar.invalidate();
      limparCampos();
      setOpenModal(false);
    },
    onError: () => toast.error("Erro ao adicionar link."),
  });

  const editarLink = trpc.linktree.editar.useMutation({
    onSuccess: () => {
      toast.success("Link editado com sucesso!");
      utils.linktree.listar.invalidate();
      limparCampos();
      setEditandoId(null);
      setOpenModal(false);
    },
    onError: () => toast.error("Erro ao editar link."),
  });

  const deletarLink = trpc.linktree.deletar.useMutation({
    onSuccess: () => {
      toast.success("Link deletado com sucesso!");
      utils.linktree.listar.invalidate();
      setDeletarId(null);
      setOpenDeleteModal(false);
    },
    onError: () => toast.error("Erro ao deletar link."),
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagem(reader.result as string); // base64 string
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSubmit() {
    if (!titulo.trim() || !url.trim() || !tipo) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (editandoId) {
      editarLink.mutate({
        id: editandoId,
        titulo,
        url,
        descricao: descricao || "",
        tipo,
        imagem: imagem || undefined,
      });
    } else {
      adicionarLink.mutate({
        titulo,
        url,
        descricao: descricao || "",
        tipo,
        imagem: imagem || undefined,
      });
    }
  }

  function abrirEditar(link: any) {
    setEditandoId(link.id);
    setTitulo(link.titulo);
    setUrl(link.url);
    setDescricao(link.descricao || "");
    setTipo(link.tipo);
    setImagem(link.imagem || null);
    setOpenModal(true);
  }

  function abrirDeletar(id: string) {
    setDeletarId(id);
    setOpenDeleteModal(true);
  }

  const clientes = links.filter((link) => link.tipo === "cliente");
  const parcerias = links.filter((link) => link.tipo === "parceria");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Linktree Manager</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciar Links</CardTitle>
            <CardDescription>
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
              <Button variant="outline">Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editandoId ? "Editar Link" : "Novo Link"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    placeholder="Ex: Loja Exemplo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
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
                  <Label htmlFor="imagem">Imagem</Label>
                  <Input
                    id="imagem"
                    type="file"
                    accept="image/*"
                    onChange={handleImagemUpload}
                  />
                  {imagem && (
                    <div className="relative mt-2 inline-block max-h-20 w-auto">
                      <img
                        src={imagem}
                        alt="Prévia da imagem"
                        className="max-h-20 w-auto rounded object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setImagem(null)}
                        aria-label="Remover imagem"
                        className="absolute top-0 right-0 rounded bg-red-600 px-1.5 py-0.5 text-white hover:bg-red-700"
                        style={{ transform: "translate(50%, -50%)" }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={tipo}
                    onValueChange={(value) =>
                      setTipo(value as "cliente" | "parceria")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="parceria">Parceria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={adicionarLink.isLoading || editarLink.isLoading}
                >
                  {adicionarLink.isLoading || editarLink.isLoading
                    ? "Salvando..."
                    : editandoId
                      ? "Salvar alterações"
                      : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="grid gap-6 md:grid-cols-2">
          {[
            ["Clientes", clientes],
            ["Parcerias", parcerias],
          ].map(([tituloSecao, lista]) => (
            <div key={tituloSecao as string}>
              <h2 className="mb-2 text-lg font-semibold">{tituloSecao}</h2>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : lista.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum {tituloSecao.toLowerCase()} adicionado.
                </p>
              ) : (
                lista.map((link: any) => (
                  <Card
                    key={link.id}
                    className="group hover:bg-muted relative flex flex-row items-center gap-4 border p-4"
                  >
                    {link.imagem && (
                      <img
                        src={link.imagem}
                        alt={`Imagem de ${link.titulo}`}
                        className="h-20 w-36 flex-shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="flex flex-grow flex-col">
                      <p className="font-semibold">{link.titulo}</p>
                      {link.descricao && (
                        <p className="text-muted-foreground line-clamp-2 text-sm">
                          {link.descricao}
                        </p>
                      )}
                      <p className="text-primary max-w-full cursor-default text-xs break-all underline">
                        {link.url}
                      </p>
                    </div>

                    {/* Botão 3 bolinhas com menu */}
                    <Menu
                      menuButton={
                        <Button
                          variant="ghost"
                          className="ml-auto h-8 w-8 p-0 text-xl font-bold"
                          aria-label="Ações"
                        >
                          &#8942;
                        </Button>
                      }
                      direction="bottom"
                      align="end"
                      className="z-50"
                    >
                      <MenuItem onClick={() => abrirEditar(link)}>
                        Editar
                      </MenuItem>
                      <MenuItem onClick={() => abrirDeletar(link.id)}>
                        Deletar
                      </MenuItem>
                    </Menu>
                  </Card>
                ))
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modal para deletar */}
      <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="mb-4">
            Tem certeza que deseja deletar este link? Essa ação não pode ser
            desfeita.
          </p>
          <div className="flex justify-end gap-4">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletarId) {
                  deletarLink.mutate(deletarId);
                }
              }}
              disabled={deletarLink.isLoading}
            >
              {deletarLink.isLoading ? "Deletando..." : "Deletar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
