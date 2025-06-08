import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { configuracoes, agendamentos, intervalosTrabalho } from "@/server/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import dayjs from "dayjs"

interface ServicoConfigurado {
  nome: string
  preco: number
  duracaoMinutos: number
}

interface IntervaloTrabalho {
  id: string
  diaSemana: string
  horaInicio: string
  horaFim: string
  tipo: "trabalho" | "intervalo"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const data = searchParams.get("data")
    const servico = searchParams.get("servico") ?? "Corte"

    console.log(`📅 [WEBHOOK-HORARIOS] Listando horários para: ${data} - ${servico}`)

    if (!data) {
      return NextResponse.json({ success: false, error: "Data é obrigatória" }, { status: 400 })
    }

    // Buscar configuração
    const config = await db
      .select()
      .from(configuracoes)
      .limit(1)
      .then((rows) => rows[0])

    if (!config) {
      return NextResponse.json({ success: false, error: "Configuração não encontrada" }, { status: 500 })
    }

    const servicos = (config.servicos as ServicoConfigurado[]) || []
    const servicoSelecionado = servicos.find((s) => s.nome.toLowerCase() === servico.toLowerCase())
    const duracaoMinutos = servicoSelecionado?.duracaoMinutos ?? 30

    // Buscar agendamentos existentes no dia
    const dataObj = dayjs(data)
    const start = dataObj.startOf("day").toDate()
    const end = dataObj.endOf("day").toDate()

    const agendamentosExistentes = await db
      .select()
      .from(agendamentos)
      .where(
        and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end), eq(agendamentos.status, "agendado")),
      )

    console.log(`📅 [WEBHOOK-HORARIOS] ${agendamentosExistentes.length} agendamentos existentes no dia`)

    // Buscar intervalos de trabalho para o dia da semana
    const diaSemana = getDiaSemana(dataObj.toDate())
    const intervalos = await db.select().from(intervalosTrabalho).where(eq(intervalosTrabalho.diaSemana, diaSemana))

    console.log(`📅 [WEBHOOK-HORARIOS] ${intervalos.length} intervalos configurados para ${diaSemana}`)

    // Gerar horários possíveis
    const horaInicio = config.horaInicio || "09:00"
    const horaFim = config.horaFim || "18:00"

    const [horaInicioNum, minutoInicioNum] = horaInicio.split(":").map(Number)
    const [horaFimNum, minutoFimNum] = horaFim.split(":").map(Number)

    if (
      horaInicioNum === undefined ||
      minutoInicioNum === undefined ||
      horaFimNum === undefined ||
      minutoFimNum === undefined
    ) {
      return NextResponse.json({ success: false, error: "Horários de funcionamento inválidos" }, { status: 500 })
    }

    const inicioMinutos = horaInicioNum * 60 + minutoInicioNum
    const fimMinutos = horaFimNum * 60 + minutoFimNum

    const horariosDisponiveis: string[] = []
    const horariosOcupados: string[] = []

    for (let minutos = inicioMinutos; minutos + duracaoMinutos <= fimMinutos; minutos += 30) {
      const hora = Math.floor(minutos / 60)
      const minuto = minutos % 60
      const horarioFormatado = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`

      // Verificar se está dentro de um intervalo de trabalho
      const horarioEmMinutos = hora * 60 + minuto
      const estaEmIntervalo = verificarSeEstaEmIntervalo(horarioEmMinutos, intervalos)

      if (estaEmIntervalo) {
        horariosOcupados.push(`${horarioFormatado} (intervalo)`)
        continue
      }

      // Verificar conflito com agendamentos existentes
      const dataHorario = dayjs(`${data}T${horarioFormatado}`)
      const dataFim = dataHorario.add(duracaoMinutos, "minute")

      const temConflito = agendamentosExistentes.some((agendamento) => {
        const inicioExistente = dayjs(agendamento.dataHora)
        const fimExistente = inicioExistente.add(agendamento.duracaoMinutos, "minute")

        return dataHorario.isBefore(fimExistente) && dataFim.isAfter(inicioExistente)
      })

      if (temConflito) {
        horariosOcupados.push(`${horarioFormatado} (ocupado)`)
      } else {
        horariosDisponiveis.push(horarioFormatado)
      }
    }

    // Separar por período
    const manha = horariosDisponiveis.filter((h) => h < "12:00")
    const tarde = horariosDisponiveis.filter((h) => h >= "12:00")

    console.log(`✅ [WEBHOOK-HORARIOS] ${horariosDisponiveis.length} horários disponíveis`)

    return NextResponse.json({
      success: true,
      horariosDisponiveis,
      horariosOcupados,
      periodos: { manha, tarde },
      dataFormatada: dataObj.format("DD/MM/YYYY"),
      total: horariosDisponiveis.length,
    })
  } catch (error) {
    console.error("💥 [WEBHOOK-HORARIOS] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}

function getDiaSemana(date: Date): string {
  const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]
  return dias[date.getDay()]
}

function verificarSeEstaEmIntervalo(horarioEmMinutos: number, intervalos: IntervaloTrabalho[]): boolean {
  // Verificar se o horário está em um intervalo de pausa
  for (const intervalo of intervalos) {
    if (intervalo.tipo === "intervalo") {
      const [horaInicio, minutoInicio] = intervalo.horaInicio.split(":").map(Number)
      const [horaFim, minutoFim] = intervalo.horaFim.split(":").map(Number)

      const inicioIntervalo = horaInicio * 60 + minutoInicio
      const fimIntervalo = horaFim * 60 + minutoFim

      if (horarioEmMinutos >= inicioIntervalo && horarioEmMinutos < fimIntervalo) {
        return true // Está em um intervalo de pausa
      }
    }
  }

  // Se não há intervalos de trabalho definidos, consideramos o horário comercial padrão
  if (intervalos.filter((i) => i.tipo === "trabalho").length === 0) {
    return false
  }

  // Se há intervalos de trabalho definidos, verificar se o horário está fora de todos eles
  let estaEmAlgumIntervaloTrabalho = false
  for (const intervalo of intervalos) {
    if (intervalo.tipo === "trabalho") {
      const [horaInicio, minutoInicio] = intervalo.horaInicio.split(":").map(Number)
      const [horaFim, minutoFim] = intervalo.horaFim.split(":").map(Number)

      const inicioTrabalho = horaInicio * 60 + minutoInicio
      const fimTrabalho = horaFim * 60 + minutoFim

      if (horarioEmMinutos >= inicioTrabalho && horarioEmMinutos < fimTrabalho) {
        estaEmAlgumIntervaloTrabalho = true
        break
      }
    }
  }

  return !estaEmAlgumIntervaloTrabalho
}
