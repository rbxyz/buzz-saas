"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function ConfiguracoesPage() {
  const [whatsappAtivo, setWhatsappAtivo] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

      {/* Cards lado a lado */}
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Configurações da Conta */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Configurações da Conta</CardTitle>
            <CardDescription>
              Gerencie as informações da sua barbearia
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome da Barbearia</Label>
              <Input id="nome" placeholder="Ex: Barbearia do João" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" placeholder="(11) 91234-5678" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                placeholder="Rua Exemplo, 123 - Bairro - Cidade"
              />
            </div>
          </CardContent>
        </Card>

        {/* Horário de Funcionamento */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Horário de Funcionamento</CardTitle>
            <CardDescription>
              Defina os dias e horários de atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dias">Dias de Atendimento</Label>
              <Select>
                <SelectTrigger id="dias">
                  <SelectValue placeholder="Seg a Sáb" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="segSab">Segunda a Sábado</SelectItem>
                  <SelectItem value="segSex">Segunda a Sexta</SelectItem>
                  <SelectItem value="todos">Todos os dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inicio">Início</Label>
                <Input id="inicio" type="time" defaultValue="09:00" />
              </div>
              <div>
                <Label htmlFor="fim">Fim</Label>
                <Input id="fim" type="time" defaultValue="18:00" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integração com Z-API */}
      <Card>
        <CardHeader>
          <CardTitle>Integração Z-API</CardTitle>
          <CardDescription>
            Configure a integração com o WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp">WhatsApp Ativo</Label>
            <Switch
              id="whatsapp"
              checked={whatsappAtivo}
              onCheckedChange={setWhatsappAtivo}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instance">Instance ID</Label>
            <Input id="instance" placeholder="ex: abcd1234" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="token">Token</Label>
            <Input id="token" placeholder="ex: zapi-xyz987" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
