"use client";

import { Separator } from "@/components/ui/separator";
import { ServicosCard } from "@/components/configuracoes/servicos-card";
import { IntervalosCard } from "@/components/configuracoes/intervalos-card";
import { ContaCard } from "@/components/configuracoes/conta-card";
import { WhatsappCard } from "@/components/configuracoes/whatsapp-card";
import { IACard } from "@/components/configuracoes/ia-card";
import { UsuariosCard } from "@/components/configuracoes/usuarios-card";

export default function Configuracoes() {
  return (
    <div className="min-h-screen">
      <div className="container w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-foreground text-3xl font-bold tracking-tight">
              Configurações
            </h1>
            <p className="text-muted-foreground">
              Gerencie as informações da empresa, serviços, horários e
              integrações.
            </p>
          </div>

          <Separator />

          {/* Layout responsivo dos cards */}
          <div className="space-y-8">
            {/* Primeira linha - Conta e Serviços dividindo espaço igualmente */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ContaCard />
              <ServicosCard />
            </div>

            {/* Segunda linha - Intervalos ocupando largura total */}
            <div className="w-full">
              <IntervalosCard />
            </div>

            {/* Terceira linha - Integrações 
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <WhatsappCard />
              <IACard />
            </div>
            */}
            {/* Quarta linha - Gerenciamento de Usuários */}
            <div className="w-full">
              <UsuariosCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
