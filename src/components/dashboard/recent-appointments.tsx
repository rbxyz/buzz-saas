import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/utils/trpc";

// Ajuste da tipagem para aceitar string ou Date
function formatDate(dateInput: string | Date) {
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

// Alinhar status conforme tipos que o backend usa
function formatStatus(status: "agendado" | "cancelado" | "concluido" | string) {
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
      // Capitaliza qualquer outro texto
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function RecentAppointments() {
  const { data, isLoading, error } =
    trpc.dashboard.getUltimosAgendamentos.useQuery();

  if (isLoading) return <div>Carregando agendamentos...</div>;
  if (error) return <div>Erro ao carregar agendamentos: {error.message}</div>;
  if (!data || data.length === 0) return <div>Nenhum agendamento recente.</div>;

  return (
    <div className="space-y-8">
      {data.map((appointment) => {
        const clientName = appointment.clienteNome || "Cliente";
        const initials = getInitials(clientName);

        return (
          <div key={appointment.id} className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src={"/placeholder.svg"} alt={clientName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm leading-none font-medium">{clientName}</p>
              <p className="text-muted-foreground text-sm">
                {appointment.servico}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm">{formatDate(appointment.dataHora)}</p>
              <Badge
                variant={
                  appointment.status === "agendado" ? "default" : "outline"
                }
                className="mt-1 capitalize"
              >
                {formatStatus(appointment.status)}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
