// app/dashboard/agendamentos/page.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export default function AgendamentosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>

      <Card>
        <CardHeader>
          <CardTitle>Calendário de Agendamentos</CardTitle>
          <CardDescription>
            Gerencie todos os agendamentos da sua barbearia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DayPicker mode="single" />
        </CardContent>
      </Card>
    </div>
  );
}
