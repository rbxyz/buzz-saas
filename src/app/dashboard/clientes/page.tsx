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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Dados fictícios dos clientes
const clientes = [
  {
    id: 1,
    nome: "João da Silva",
    cpf: "123.456.789-00",
    telefone: "(11) 91234-5678",
    email: "joao@email.com",
    nascimento: "1990-05-10",
    endereco: "Rua A, 123 - Centro - São Paulo",
    observacoes: "Prefere atendimento aos sábados.",
  },
  {
    id: 2,
    nome: "Maria Oliveira",
    cpf: "987.654.321-00",
    telefone: "(21) 99876-5432",
    email: "maria@email.com",
    nascimento: "1985-10-25",
    endereco: "Av. B, 456 - Copacabana - Rio de Janeiro",
    observacoes: "Cliente fiel desde 2018.",
  },
  {
    id: 3,
    nome: "Carlos Souza",
    cpf: "111.222.333-44",
    telefone: "(31) 93456-7890",
    email: "carlos@email.com",
    nascimento: "1993-03-12",
    endereco: "Rua C, 789 - Savassi - Belo Horizonte",
    observacoes: "Sempre agenda para às 9h.",
  },
  {
    id: 4,
    nome: "Ana Pereira",
    cpf: "555.666.777-88",
    telefone: "(41) 91234-9876",
    email: "ana@email.com",
    nascimento: "2000-08-15",
    endereco: "Rua D, 101 - Batel - Curitiba",
    observacoes: "Solicitou agendamentos por WhatsApp.",
  },
];

export default function ClientesPage() {
  const [clienteSelecionado, setClienteSelecionado] = useState<
    (typeof clientes)[0] | null
  >(null);
  const [modalAberto, setModalAberto] = useState(false);

  function abrirModal(cliente: (typeof clientes)[0]) {
    setClienteSelecionado(cliente);
    setModalAberto(true);
  }

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
          {clientes.map((cliente) => (
            <Card key={cliente.id} className="border p-4 shadow-sm">
              <CardTitle className="text-base">{cliente.nome}</CardTitle>
              <CardDescription className="text-sm">
                {cliente.email}
              </CardDescription>
              <div className="text-muted-foreground mb-2 text-sm">
                {cliente.telefone}
              </div>
              <Button variant="outline" onClick={() => abrirModal(cliente)}>
                Ver detalhes
              </Button>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {clienteSelecionado && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Nome completo</Label>
                <Input value={clienteSelecionado.nome} readOnly />
              </div>
              <div>
                <Label>CPF / CNPJ</Label>
                <Input value={clienteSelecionado.cpf} readOnly />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={clienteSelecionado.telefone} readOnly />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={clienteSelecionado.email} readOnly />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input value={clienteSelecionado.nascimento} readOnly />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={clienteSelecionado.endereco} readOnly />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={clienteSelecionado.observacoes} readOnly />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
