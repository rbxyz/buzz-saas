import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/server/db"
import { configuracoes, agendamentos } from "@/server/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import dayjs from "dayjs"

interface ServicoConfigurado {
  nome: string
  preco: number
  duracaoMinutos: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, horario, servico } = body

    console.log(`🔍 [WEBHOOK-DISPONIBILIDADE] Verificando:`, body)

    if (!data || !horario || !servico) {
      return NextResponse.json({ success: false, error: "Dados obrigatórios: data, horario, servico" }, { status: 400 })
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

    // Verificar se a data/horário está no passado
    const dataHorario = dayjs(`${data}T${horario}`)
    const agora = dayjs()

    if (dataHorario.isBefore(agora)) {
      return NextResponse.json({
        success: true,
        disponivel: false,
        motivo: "Data/horário no passado",
        horariosAlternativos: [],
      })
    }

    // Verificar conflitos com agendamentos existentes
    const dataInicio = dataHorario.toDate()
    const dataFim = dataHorario.add(duracaoMinutos, "minute").toDate()

    const start = dataHorario.startOf("day").toDate()
    const end = dataHorario.endOf("day").toDate()

    const agendamentosExistentes = await db
      .select()
      .from(agendamentos)
      .where(
        and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end), eq(agendamentos.status, "agendado")),
      )

    console.log(`🔍 [WEBHOOK-DISPONIBILIDADE] Agendamentos existentes no dia:`, agendamentosExistentes.length)

    // Verificar se há conflito
    const temConflito = agendamentosExistentes.some((agendamento) => {
      const inicioExistente = dayjs(agendamento.dataHora)
      const fimExistente = inicioExistente.add(agendamento.duracaoMinutos, "minute")

      return dataHorario.isBefore(fimExistente) && dayjs(dataFim).isAfter(inicioExistente)
    })

    if (temConflito) {
      // Buscar horários alternativos no mesmo dia
      const horariosAlternativos = await buscarHorariosAlternativos(data, servico, config, agendamentosExistentes)

      return NextResponse.json({
        success: true,
        disponivel: false,
        motivo: "Horário ocupado",
        horariosAlternativos,
      })
    }

    // Verificar se está dentro do horário de funcionamento
    const horaInicio = config.horaInicio || "09:00"
    const horaFim = config.horaFim || "18:00"

    if (horario < horaInicio || horario >= horaFim) {
      const horariosAlternativos = await buscarHorariosAlternativos(data, servico, config, agendamentosExistentes)

      return NextResponse.json({
        success: true,
        disponivel: false,
        motivo: "Fora do horário de funcionamento",
        horariosAlternativos,
      })
    }

    console.log(`✅ [WEBHOOK-DISPONIBILIDADE] Horário disponível!`)
    return NextResponse.json({
      success: true,
      disponivel: true,
    })
  } catch (error) {
    console.error("💥 [WEBHOOK-DISPONIBILIDADE] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}

async function buscarHorariosAlternativos(
  data: string,
  servico: string,
  config: any,
  agendamentosExistentes: any[],
): Promise<string[]> {
  try {
    const servicos = (config.servicos as ServicoConfigurado[]) || []
    const servicoSelecionado = servicos.find((s) => s.nome.toLowerCase() === servico.toLowerCase())
    const duracaoMinutos = servicoSelecionado?.duracaoMinutos ?? 30

    // Gerar horários possíveis (de 30 em 30 minutos)
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
      return []
    }

    const inicioMinutos = horaInicioNum * 60 + minutoInicioNum
    const fimMinutos = horaFimNum * 60 + minutoFimNum

    const horariosDisponiveis: string[] = []

    for (let minutos = inicioMinutos; minutos + duracaoMinutos <= fimMinutos; minutos += 30) {
      const hora = Math.floor(minutos / 60)
      const minuto = minutos % 60
      const horarioFormatado = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`

      // Verificar se este horário está livre
      const dataHorario = dayjs(`${data}T${horarioFormatado}`)
      const dataFim = dataHorario.add(duracaoMinutos, "minute")

      const temConflito = agendamentosExistentes.some((agendamento) => {
        const inicioExistente = dayjs(agendamento.dataHora)
        const fimExistente = inicioExistente.add(agendamento.duracaoMinutos, "minute")

        return dataHorario.isBefore(fimExistente) && dataFim.isAfter(inicioExistente)
      })

      if (!temConflito) {
        horariosDisponiveis.push(horarioFormatado)
      }
    }

    return horariosDisponiveis.slice(0, 5) // Máximo 5 sugestões
  } catch (error) {
    console.error("💥 [WEBHOOK-DISPONIBILIDADE] Erro ao buscar horários alternativos:", error)
    return []
  }
}
