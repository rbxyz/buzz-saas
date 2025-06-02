"use client";

import { useState, type ReactElement } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Overview } from "@/components/dashboard/overview";
import { RecentAppointments } from "@/components/dashboard/recent-appointments";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

export default function DashboardPage(): ReactElement {
  const [isLoading, setIsLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="border-border bg-card flex items-center gap-3 rounded-lg border px-6 py-4 shadow-xl">
          <div className="border-muted border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
          <span className="text-foreground text-sm font-medium">
            Carregando agente inteligente...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 p-6">
      <h1 className="text-foreground text-3xl font-bold tracking-tight">
        Dashboard
      </h1>

      <DashboardStats />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>Agendamentos dos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <Overview />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Agendamentos Recentes</CardTitle>
            <CardDescription>Últimos 5 agendamentos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentAppointments />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
