import { api } from "@/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, User } from "lucide-react"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/server/api/root"
import { cn } from "@/lib/utils"

type Agendamentos = inferRouterOutputs<AppRouter>["agendamento"]["getRecents"]

export function RecentAppointments() {
  const { data: appointments, isLoading, error } = api.agendamento.getRecents.useQuery(
    undefined,
    {
      staleTime: 30 * 1000, // 30 segundos
      gcTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
      refetchInterval: 60 * 1000, // Atualiza a cada minuto
    }
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 rounded-lg border border-subtle animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded-md"></div>
              <div className="h-3 w-24 bg-muted rounded-md"></div>
              <div className="h-3 w-20 bg-muted rounded-md"></div>
            </div>
            <div className="h-6 w-16 bg-muted rounded-full"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-body text-muted-foreground">
          Erro ao carregar agendamentos
        </p>
        <p className="text-body-small text-muted-foreground/60 mt-1">
          {error.message}
        </p>
      </div>
    )
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 mx-auto mb-3">
          <Calendar className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-body text-muted-foreground">
          Nenhum agendamento recente
        </p>
        <p className="text-body-small text-muted-foreground/60 mt-1">
          Os novos agendamentos aparecerão aqui
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment: Agendamentos[0]) => {
        const appointmentDate = new Date(appointment.dataHora)
        const isToday = appointmentDate.toDateString() === new Date().toDateString()
        const isPast = appointmentDate < new Date()
        
        return (
          <div 
            key={appointment.id} 
            className={cn(
              "flex items-center space-x-4 p-3 rounded-lg border transition-all duration-200",
              "hover:bg-muted/30 hover:border-border/80",
              isToday && "border-brand-primary/20 bg-brand-light/10",
              isPast && "opacity-60"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shadow-minimal",
              appointment.status === "confirmado" 
                ? "bg-success/10 text-success" 
                : appointment.status === "cancelado"
                ? "bg-destructive/10 text-destructive"
                : "bg-brand-light/30 text-brand-primary"
            )}>
              <User className="h-4 w-4" />
            </div>
            
            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-body-small font-medium text-foreground truncate">
                  {appointment.clienteNome ?? "Cliente não informado"}
                </p>
                <Badge 
                  variant={appointment.status === "confirmado" ? "default" : "secondary"}
                  className={cn(
                    "text-caption font-medium px-2 py-0.5",
                    appointment.status === "confirmado" && "bg-success/10 text-success border-success/20",
                    appointment.status === "cancelado" && "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {appointment.status}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-3 text-caption text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{appointmentDate.toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{appointmentDate.toLocaleTimeString("pt-BR", { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </div>
              </div>
              
              {appointment.servico && (
                <p className="text-caption text-muted-foreground/80 truncate">
                  {appointment.servico}
                </p>
              )}
            </div>
          </div>
        )
      })}
      
      {appointments.length === 5 && (
        <div className="text-center pt-2">
          <p className="text-caption text-muted-foreground/60">
            Mostrando os 5 agendamentos mais recentes
          </p>
        </div>
      )}
    </div>
  )
}
