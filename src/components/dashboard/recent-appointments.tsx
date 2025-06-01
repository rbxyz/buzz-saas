import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/utils/trpc";

// Tipos específicos para o status
type AppointmentStatus = "agendado" | "cancelado" | "concluido" | "pendente";

// Interface para o appointment
interface Appointment {
  id: string;
  clienteNome: string | null;
  servico: string;
  dataHora: string | Date;
  status: AppointmentStatus;
}

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

// Removido o "| string" para evitar tipos redundantes
function formatStatus(status: AppointmentStatus): string {
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
      // TypeScript garante que este caso nunca será alcançado
      return status;
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
  // Query otimizada com cache de 1 minuto
  const { data, isLoading, error, isStale } =
    trpc.dashboard.getUltimosAgendamentos.useQuery(undefined, {
      staleTime: 60 * 1000, // 1 minuto
      gcTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
      refetchInterval: 2 * 60 * 1000, // Atualiza a cada 2 minutos
    });

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

  if (error) return <div>Erro ao carregar agendamentos: {error.message}</div>;
  if (!data || data.length === 0) return <div>Nenhum agendamento recente.</div>;

  return (
    <div className={`space-y-8 ${isStale ? "opacity-75" : ""}`}>
      {isStale && (
        <div className="text-muted-foreground mb-4 text-center text-xs">
          Atualizando dados...
        </div>
      )}
      {data.map((appointment: Appointment) => {
        const clientName = appointment.clienteNome ?? "Cliente";
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
