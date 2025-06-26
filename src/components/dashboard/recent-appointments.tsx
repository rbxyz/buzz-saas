import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Agendamento = RouterOutput["agendamento"]["getRecents"][0];

// Ajuste da tipagem para aceitar string ou Date
function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isTomorrow =
    date.getDate() === now.getDate() + 1 &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Hoje, ${time}`;
  if (isTomorrow) return `Amanhã, ${time}`;
  return date.toLocaleDateString("pt-BR") + ", " + time;
}

// Função que aceita string e retorna o status formatado
function formatStatus(status: string): string {
  switch (status) {
    case "agendado":
      return "Agendado";
    case "pendente":
      return "Pendente";
    case "cancelado":
      return "Cancelado";
    case "concluido":
      return "Concluído";
    default:
      // Para qualquer status não conhecido, retorna capitalizado
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function RecentAppointments() {
  const { data: agendamentos, isLoading } = api.agendamento.getRecents.useQuery();

  // Loading skeleton - usando Array.from para evitar spread inseguro
  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex animate-pulse items-center">
            <div className="bg-muted h-9 w-9 rounded-full"></div>
            <div className="ml-4 flex-1 space-y-1">
              <div className="bg-muted h-4 w-24 rounded"></div>
              <div className="bg-muted h-3 w-32 rounded"></div>
            </div>
            <div className="text-right">
              <div className="bg-muted mb-1 h-4 w-20 rounded"></div>
              <div className="bg-muted h-5 w-16 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!agendamentos || agendamentos.length === 0) return <div>Nenhum agendamento recente.</div>;

  return (
    <div className="space-y-8">
      {agendamentos.map((appointment) => {
        const clientName = appointment.clienteNome ?? "Cliente";
        const initials = getInitials(clientName);

        return (
          <div key={appointment.id} className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src={"/avatars/01.png"} alt="Avatar" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">{clientName}</p>
              <p className="text-sm text-muted-foreground">
                {appointment.servico}
              </p>
            </div>
            <div className="ml-auto font-medium">
              <Badge variant="outline">{appointment.status}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
