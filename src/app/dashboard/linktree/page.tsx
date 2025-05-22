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
  DialogTrigger,
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

export default function LinktreePage() {
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"cliente" | "parceria" | "">("");
  const [imagem, setImagem] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: links = [], isLoading } = trpc.linktree.listar.useQuery();

  const adicionarLink = trpc.linktree.criar.useMutation({
    onSuccess: () => {
      toast.success("Link adicionado com sucesso!");
      utils.linktree.listar.invalidate();
      limparCampos();
    },
    onError: () => {
      toast.error("Erro ao adicionar link.");
    },
  });

  function limparCampos() {
    setTitulo("");
    setUrl("");
    setDescricao("");
    setTipo("");
    setImagem(null);
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

  function handleAddLink() {
    if (!titulo.trim() || !url.trim() || !tipo) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    adicionarLink.mutate({
      titulo,
      url,
      descricao: descricao || "",
      tipo,
      imagem: imagem || undefined,
    });
  }

  const clientes = links.filter((link: any) => link.tipo === "cliente");
  const parcerias = links.filter((link: any) => link.tipo === "parceria");

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

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Link</DialogTitle>
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
                  onClick={handleAddLink}
                  className="w-full"
                  disabled={adicionarLink.isLoading}
                >
                  {adicionarLink.isLoading ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-lg font-semibold">Clientes</h2>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : clientes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum cliente adicionado.
              </p>
            ) : (
              clientes.map((link: any) => (
                <div
                  key={link.id}
                  className="hover:bg-muted flex flex-col gap-1 rounded-xl border p-4 transition"
                >
                  <p className="font-medium">{link.titulo}</p>
                  {link.descricao && (
                    <p className="text-muted-foreground text-sm">
                      {link.descricao}
                    </p>
                  )}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-semibold hover:underline"
                  >
                    Visitar
                  </a>
                </div>
              ))
            )}
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">Parcerias</h2>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : parcerias.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhuma parceria adicionada.
              </p>
            ) : (
              parcerias.map((link: any) => (
                <div
                  key={link.id}
                  className="hover:bg-muted flex flex-col gap-1 rounded-xl border p-4 transition"
                >
                  <p className="font-medium">{link.titulo}</p>
                  {link.descricao && (
                    <p className="text-muted-foreground text-sm">
                      {link.descricao}
                    </p>
                  )}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-semibold hover:underline"
                  >
                    Visitar
                  </a>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
