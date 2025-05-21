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

export default function ClientesPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<
    string | null
  >(null);

  const { data: clientes, isLoading, error } = trpc.cliente.listar.useQuery();

  const { data: clienteSelecionado } = trpc.cliente.getById.useQuery(
    clienteSelecionadoId ?? "", // apenas a string, não objeto
    {
      enabled: !!clienteSelecionadoId,
    },
  );

  function abrirModal(id: string) {
    setClienteSelecionadoId(id);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setClienteSelecionadoId(null);
  }

  if (isLoading) return <p>Carregando clientes...</p>;
  if (error) return <p>Erro ao carregar clientes: {error.message}</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>

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
                <Button
                  variant="outline"
                  onClick={() => abrirModal(cliente.id)}
                >
                  Ver detalhes
                </Button>
              </Card>
            ))
          ) : (
            <p>Nenhum cliente encontrado.</p>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
