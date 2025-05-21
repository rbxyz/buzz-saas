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
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/utils/trpc";
import { Loader2, PlusCircle } from "lucide-react";

export default function AgendamentosPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: agendamentos, isLoading } = trpc.agendamento.getByDate.useQuery(
    {
      date: selectedDate.toISOString(),
    },
  );

  const createMutation = trpc.agendamento.create.useMutation();

  const handleNovoAgendamento = () => {
    createMutation.mutate({
      clienteId: "EXEMPLO_ID", // trocar depois por seleção dinâmica
      data: selectedDate.toISOString(),
      horario: "14:00",
      servico: "Corte de cabelo",
      status: "PENDENTE",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Calendário */}
        <Card>
          <CardHeader>
            <CardTitle>Calendário de Agendamentos</CardTitle>
            <CardDescription>Gerencie os agendamentos por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Lista de agendamentos do dia */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                Agendamentos de {format(selectedDate, "dd/MM/yyyy")}
              </CardTitle>
              <CardDescription>
                Total: {agendamentos?.length || 0}
              </CardDescription>
            </div>
            <Button onClick={handleNovoAgendamento}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : agendamentos && agendamentos.length > 0 ? (
              agendamentos.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="rounded-lg border p-3 shadow-sm"
                >
                  <p className="font-semibold">
                    {agendamento.horario} — {agendamento.servico}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Cliente: {agendamento.cliente?.nome || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status: {agendamento.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhum agendamento para este dia.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
