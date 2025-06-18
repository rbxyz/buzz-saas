import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { configuracoes, agendamentos, intervalosTrabalho, servicos } from "@/server/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import dayjs from "dayjs"

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

    const servicosDisponiveis = await db.select().from(servicos).where(eq(servicos.ativo, true));
    const servicoSelecionado = servicosDisponiveis.find((s) => s.nome.toLowerCase() === servico.toLowerCase())
    const duracaoMinutos = servicoSelecionado?.duracao ?? 30

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
    const intervalos = await db.select().from(intervalosTrabalho).where(and(eq(intervalosTrabalho.diaSemana, diaSemana), eq(intervalosTrabalho.ativo, true)))

    console.log(`📅 [WEBHOOK-HORARIOS] ${intervalos.length} intervalos configurados para ${diaSemana}`)

    if (intervalos.length === 0) {
      return NextResponse.json({ success: true, horariosDisponiveis: [], manha: [], tarde: [], error: "Fechado" });
    }

    // Gerar horários possíveis
    const horariosDisponiveis: string[] = []
    const horariosOcupados: string[] = []

    for (const intervalo of intervalos) {
      const { horaInicio, horaFim } = intervalo;
      const [horaInicioNum, minutoInicioNum] = horaInicio.split(":").map(Number)
      const [horaFimNum, minutoFimNum] = horaFim.split(":").map(Number)

      if (
        horaInicioNum === undefined ||
        minutoInicioNum === undefined ||
        horaFimNum === undefined ||
        minutoFimNum === undefined
      ) {
        continue;
      }

      const inicioMinutos = horaInicioNum * 60 + minutoInicioNum
      const fimMinutos = horaFimNum * 60 + minutoFimNum

      for (let minutos = inicioMinutos; minutos + duracaoMinutos <= fimMinutos; minutos += 30) {
        const hora = Math.floor(minutos / 60)
        const minuto = minutos % 60
        const horarioFormatado = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`

        // Verificar conflito com agendamentos existentes
        const dataHorario = dayjs(`${data}T${horarioFormatado}`)
        const dataFim = dataHorario.add(duracaoMinutos, "minute")

        const temConflito = agendamentosExistentes.some((agendamento) => {
          const inicioExistente = dayjs(agendamento.dataHora)
          const fimExistente = inicioExistente.add(agendamento.duracaoMinutos ?? 30, "minute")

          return dataHorario.isBefore(fimExistente) && dataFim.isAfter(inicioExistente)
        })

        if (temConflito) {
          horariosOcupados.push(`${horarioFormatado} (ocupado)`)
        } else {
          horariosDisponiveis.push(horarioFormatado)
        }
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
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}

function getDiaSemana(date: Date): number {
  return date.getDay()
}
