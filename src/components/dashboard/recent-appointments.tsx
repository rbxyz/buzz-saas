import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function RecentAppointments() {
  const appointments = [
    {
      id: "1",
      client: {
        name: "João Silva",
        image: "/placeholder.svg?height=32&width=32",
        initials: "JS",
      },
      service: "Corte + Barba",
      date: "Hoje, 14:30",
      status: "confirmado",
    },
    {
      id: "2",
      client: {
        name: "Carlos Oliveira",
        image: "/placeholder.svg?height=32&width=32",
        initials: "CO",
      },
      service: "Corte Degradê",
      date: "Hoje, 16:00",
      status: "pendente",
    },
    {
      id: "3",
      client: {
        name: "Pedro Santos",
        image: "/placeholder.svg?height=32&width=32",
        initials: "PS",
      },
      service: "Barba",
      date: "Amanhã, 10:15",
      status: "confirmado",
    },
    {
      id: "4",
      client: {
        name: "Lucas Ferreira",
        image: "/placeholder.svg?height=32&width=32",
        initials: "LF",
      },
      service: "Corte Simples",
      date: "Amanhã, 11:30",
      status: "confirmado",
    },
    {
      id: "5",
      client: {
        name: "Mateus Costa",
        image: "/placeholder.svg?height=32&width=32",
        initials: "MC",
      },
      service: "Corte + Barba + Sobrancelha",
      date: "Amanhã, 15:45",
      status: "pendente",
    },
  ]

  return (
    <div className="space-y-8">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={appointment.client.image || "/placeholder.svg"} alt={appointment.client.name} />
            <AvatarFallback>{appointment.client.initials}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{appointment.client.name}</p>
            <p className="text-sm text-muted-foreground">{appointment.service}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm">{appointment.date}</p>
            <Badge variant={appointment.status === "confirmado" ? "default" : "outline"} className="mt-1">
              {appointment.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
