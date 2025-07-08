"use client";

import { Separator } from "@/components/ui/separator";
import { ServicosCard } from "@/components/configuracoes/servicos-card";
import { IntervalosCard } from "@/components/configuracoes/intervalos-card";
import { ContaCard } from "@/components/configuracoes/conta-card";
import { UsuariosCard } from "@/components/configuracoes/usuarios-card";
import { CoresCard } from "@/components/configuracoes/cores-card";
import { EstabelecimentoCard } from "@/components/configuracoes/estabelecimento-card";
import { AgendamentosCard } from "@/components/configuracoes/agendamentos-card";

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
            {/* Primeira linha - Conta e Estabelecimento */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ContaCard />
              <EstabelecimentoCard />
            </div>

            {/* Segunda linha - Serviços */}
            <div className="w-full">
              <ServicosCard />
            </div>

            {/* Terceira linha - Intervalos */}
            <div className="w-full">
              <IntervalosCard />
            </div>

            {/* Quarta linha - Configuração de Cores */}
            <div className="w-full">
              <CoresCard />
            </div>

            {/* Quinta linha - Gerenciamento de Usuários */}
            <div className="w-full">
              <UsuariosCard />
            </div>

            {/* Sexta linha - Gerenciamento de Agendamentos */}
            <div className="w-full">
              <AgendamentosCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
