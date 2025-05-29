import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { agendamentos, clientes, intervalosTrabalho } from "@/server/db/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import dayjs from "dayjs"
import { sql, desc } from "drizzle-orm"

type ServicoConfigurado = {
  nome: string
  preco: number
  duracaoMinutos?: number
}

// Função helper para converter dia da semana
function getDiaSemana(date: Date): string {
  const dias = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]
  return dias[date.getDay()]!
}

// Função helper para gerar horários disponíveis
function gerarHorarios(inicio: string, fim: string, duracaoServico: number): string[] {
  const horarios: string[] = []
  const [horaInicio, minutoInicio] = inicio.split(":").map(Number)
  const [horaFim, minutoFim] = fim.split(":").map(Number)

  const inicioMinutos = horaInicio! * 60 + minutoInicio!
  const fimMinutos = horaFim! * 60 + minutoFim!

  for (let minutos = inicioMinutos; minutos + duracaoServico <= fimMinutos; minutos += 30) {
    const hora = Math.floor(minutos / 60)
    const minuto = minutos % 60
    horarios.push(`${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`)
  }

  return horarios
}

export const agendamentoRouter = createTRPCRouter({
  getByData: publicProcedure.input(z.object({ date: z.string() })).query(async ({ input }) => {
    const start = dayjs(input.date).startOf("day").toDate()
    const end = dayjs(input.date).endOf("day").toDate()

    const agendamentosDoDia = await db
      .select({
        id: agendamentos.id,
        dataHora: agendamentos.dataHora,
        servico: agendamentos.servico,
        status: agendamentos.status,
        duracaoMinutos: agendamentos.duracaoMinutos,
        cliente: {
          nome: clientes.nome,
        },
      })
      .from(agendamentos)
      .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
      .where(and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end)))
      .orderBy(agendamentos.dataHora)

    return agendamentosDoDia
  }),

  create: publicProcedure
    .input(
      z.object({
        clienteId: z.string().uuid(),
        data: z.string(),
        horario: z.string(),
        servico: z.string(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
      }),
    )
    .mutation(async ({ input }) => {
      const dataHora = dayjs(`${input.data}T${input.horario}`).toDate()

      const configuracao = await db.query.configuracoes.findFirst()
      if (!configuracao) throw new Error("Configuração não encontrada")

      const servicos = configuracao.servicos as ServicoConfigurado[]
      const servicoSelecionado = servicos.find((s) => s.nome.toLowerCase() === input.servico.toLowerCase())

      if (!servicoSelecionado) {
        throw new Error(`Serviço "${input.servico}" não encontrado na configuração`)
      }

      const valorCobrado = servicoSelecionado.preco
      const duracaoMinutos = servicoSelecionado.duracaoMinutos ?? 30

      // Verificar conflitos de horário
      const dataInicio = dayjs(`${input.data}T${input.horario}`)
      const dataFim = dataInicio.add(duracaoMinutos, "minute")

      const start = dataInicio.startOf("day").toDate()
      const end = dataInicio.endOf("day").toDate()

      const agendamentosExistentes = await db
        .select({
          dataHora: agendamentos.dataHora,
          duracaoMinutos: agendamentos.duracaoMinutos,
        })
        .from(agendamentos)
        .where(
          and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end), eq(agendamentos.status, "agendado")),
        )

      // Verificar se há conflito
      const temConflito = agendamentosExistentes.some((agendamento) => {
        const inicioExistente = dayjs(agendamento.dataHora)
        const fimExistente = inicioExistente.add(agendamento.duracaoMinutos, "minute")

        // Verifica se há sobreposição
        return dataInicio.isBefore(fimExistente) && dataFim.isAfter(inicioExistente)
      })

      if (temConflito) {
        throw new Error("Horário não disponível - conflita com outro agendamento")
      }

      const result = await db
        .insert(agendamentos)
        .values({
          clienteId: input.clienteId,
          dataHora,
          servico: input.servico,
          status: input.status,
          valorCobrado,
          duracaoMinutos,
        })
        .returning({
          id: agendamentos.id,
        })

      return result[0]
    }),

  // Novas funcionalidades públicas
  getServicos: publicProcedure.query(async () => {
    const configuracao = await db.query.configuracoes.findFirst()
    if (!configuracao) return []

    const servicos = configuracao.servicos as ServicoConfigurado[]
    return servicos.map((servico) => ({
      nome: servico.nome,
      preco: servico.preco,
      duracaoMinutos: servico.duracaoMinutos || 30,
    }))
  }),

  getConfiguracoes: publicProcedure.query(async () => {
    const configuracao = await db.query.configuracoes.findFirst()
    return configuracao
      ? {
          nome: configuracao.nome,
          telefone: configuracao.telefone,
          endereco: configuracao.endereco,
          diasAntecedenciaAgendamento: configuracao.diasAntecedenciaAgendamento || 30,
        }
      : null
  }),

  getHorariosDisponiveis: publicProcedure
    .input(
      z.object({
        data: z.string(),
        servico: z.string(),
      }),
    )
    .query(async ({ input }) => {
      if (!input.data || !input.servico) {
        return { horarios: [], erro: null }
      }

      const data = dayjs(input.data)
      const diaSemana = getDiaSemana(data.toDate()) as any

      // Verificar se a data não é no passado
      if (data.isBefore(dayjs(), "day")) {
        return { horarios: [], erro: "Não é possível agendar para datas passadas" }
      }

      // Buscar intervalos de trabalho para este dia
      const intervalos = await db.query.intervalosTrabalho.findMany({
        where: and(eq(intervalosTrabalho.diaSemana, diaSemana), eq(intervalosTrabalho.ativo, true)),
        orderBy: [intervalosTrabalho.horaInicio],
      })

      if (intervalos.length === 0) {
        return { horarios: [], erro: "Estabelecimento fechado neste dia" }
      }

      // Buscar configuração para pegar duração do serviço
      const configuracao = await db.query.configuracoes.findFirst()
      if (!configuracao) {
        return { horarios: [], erro: "Configuração não encontrada" }
      }

      const servicos = configuracao.servicos as ServicoConfigurado[]
      const servicoSelecionado = servicos.find((s) => s.nome === input.servico)
      if (!servicoSelecionado) {
        return { horarios: [], erro: "Serviço não encontrado" }
      }

      const duracaoServico = servicoSelecionado.duracaoMinutos || 30

      // Gerar todos os horários possíveis dos intervalos
      let horariosDisponiveis: string[] = []
      for (const intervalo of intervalos) {
        const horariosIntervalo = gerarHorarios(intervalo.horaInicio, intervalo.horaFim, duracaoServico)
        horariosDisponiveis = [...horariosDisponiveis, ...horariosIntervalo]
      }

      // Buscar agendamentos existentes para este dia
      const start = data.startOf("day").toDate()
      const end = data.endOf("day").toDate()

      const agendamentosExistentes = await db
        .select({
          dataHora: agendamentos.dataHora,
          duracaoMinutos: agendamentos.duracaoMinutos,
        })
        .from(agendamentos)
        .where(
          and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end), eq(agendamentos.status, "agendado")),
        )

      // Filtrar horários ocupados
      const horariosLivres = horariosDisponiveis.filter((horario) => {
        const dataHorario = dayjs(`${input.data}T${horario}`)
        const fimNovoAgendamento = dataHorario.add(duracaoServico, "minute")

        // Verificar se não há conflito com agendamentos existentes
        return !agendamentosExistentes.some((agendamento) => {
          const inicioAgendamento = dayjs(agendamento.dataHora)
          const fimAgendamento = inicioAgendamento.add(agendamento.duracaoMinutos, "minute")

          // Verifica se há sobreposição
          return dataHorario.isBefore(fimAgendamento) && fimNovoAgendamento.isAfter(inicioAgendamento)
        })
      })

      // Se for hoje, filtrar horários que já passaram
      if (data.isSame(dayjs(), "day")) {
        const agora = dayjs()
        const horariosValidos = horariosLivres.filter((horario) => {
          const dataHorario = dayjs(`${input.data}T${horario}`)
          return dataHorario.isAfter(agora.add(30, "minute")) // 30 minutos de antecedência mínima
        })
        return { horarios: horariosValidos, erro: null }
      }

      return { horarios: horariosLivres, erro: null }
    }),

  criarAgendamentoPublico: publicProcedure
    .input(
      z.object({
        nome: z.string(),
        telefone: z.string(),
        email: z.string().optional(),
        data: z.string(),
        horario: z.string(),
        servico: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Verificar se já existe cliente com este telefone
      let cliente = await db.query.clientes.findFirst({
        where: eq(clientes.telefone, input.telefone),
      })

      // Se não existe, criar novo cliente
      if (!cliente) {
        const novoCliente = await db
          .insert(clientes)
          .values({
            nome: input.nome,
            telefone: input.telefone,
            email: input.email,
          })
          .returning()
        cliente = novoCliente[0]!
      }

      // Verificar disponibilidade do horário
      const dataHora = dayjs(`${input.data}T${input.horario}`)
      const configuracao = await db.query.configuracoes.findFirst()

      if (!configuracao) {
        throw new Error("Configuração não encontrada")
      }

      const servicos = configuracao.servicos as ServicoConfigurado[]
      const servicoSelecionado = servicos.find((s) => s.nome === input.servico)

      if (!servicoSelecionado) {
        throw new Error("Serviço não encontrado")
      }

      const duracaoMinutos = servicoSelecionado.duracaoMinutos || 30
      const fimAgendamento = dataHora.add(duracaoMinutos, "minute")

      // Verificar conflitos
      const start = dataHora.startOf("day").toDate()
      const end = dataHora.endOf("day").toDate()

      const conflitos = await db
        .select()
        .from(agendamentos)
        .where(
          and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end), eq(agendamentos.status, "agendado")),
        )

      const temConflito = conflitos.some((agendamento) => {
        const inicioExistente = dayjs(agendamento.dataHora)
        const fimExistente = inicioExistente.add(agendamento.duracaoMinutos, "minute")

        return dataHora.isBefore(fimExistente) && fimAgendamento.isAfter(inicioExistente)
      })

      if (temConflito) {
        throw new Error("Horário não disponível")
      }

      // Criar agendamento
      const result = await db
        .insert(agendamentos)
        .values({
          clienteId: cliente.id,
          dataHora: dataHora.toDate(),
          servico: input.servico,
          status: "agendado",
          valorCobrado: servicoSelecionado.preco,
          duracaoMinutos,
        })
        .returning()

      return result[0]
    }),

  // Nova mutation para solicitação de agendamento público
  criarSolicitacaoAgendamento: publicProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
        dataDesejada: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Verificar se já existe cliente com este telefone
      let cliente = await db.query.clientes.findFirst({
        where: eq(clientes.telefone, input.telefone),
      })

      let isClienteExistente = false

      // Se não existe, criar novo cliente
      if (!cliente) {
        const novoCliente = await db
          .insert(clientes)
          .values({
            nome: input.nome,
            telefone: input.telefone,
            email: null, // Email não é obrigatório na solicitação pública
          })
          .returning()
        cliente = novoCliente[0]!
      } else {
        isClienteExistente = true
        // Se existe, atualizar o nome caso seja diferente
        if (cliente.nome !== input.nome) {
          await db.update(clientes).set({ nome: input.nome, updatedAt: new Date() }).where(eq(clientes.id, cliente.id))
        }
      }

      // Por enquanto, vamos apenas retornar sucesso
      // Em uma implementação real, você poderia:
      // 1. Salvar a solicitação em uma tabela separada
      // 2. Enviar notificação para o admin
      // 3. Integrar com WhatsApp/SMS para contato

      return {
        success: true,
        clienteId: cliente.id,
        clienteExistente: isClienteExistente,
        message: isClienteExistente
          ? "Solicitação registrada para cliente existente"
          : "Solicitação de agendamento recebida com sucesso",
      }
    }),

  atualizarStatus: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(agendamentos)
        .set({ status: input.status })
        .where(eq(agendamentos.id, input.id))
        .returning()

      return result[0]
    }),

  getByClientCode: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
    const searchTerm = `%${input.query.toLowerCase()}%`

    const clientesEncontrados = await db
      .select({
        id: clientes.id,
        nome: clientes.nome,
      })
      .from(clientes)
      .where(sql`LOWER(${clientes.nome}) LIKE ${searchTerm}`)
      .limit(10)

    return clientesEncontrados
  }),

  getCortesDoMes: publicProcedure.input(z.object({ month: z.number(), year: z.number() })).query(async ({ input }) => {
    const startDate = new Date(input.year, input.month - 1, 1)
    const endDate = new Date(input.year, input.month, 0, 23, 59, 59)

    const cortes = await db
      .select({
        id: agendamentos.id,
        dataHora: agendamentos.dataHora,
        servico: agendamentos.servico,
        status: agendamentos.status,
        cliente: {
          nome: clientes.nome,
        },
      })
      .from(agendamentos)
      .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
      .where(
        and(
          gte(agendamentos.dataHora, startDate),
          lte(agendamentos.dataHora, endDate),
          sql`${agendamentos.servico} ILIKE '%corte%'`,
        ),
      )
      .orderBy(desc(agendamentos.dataHora))

    return cortes
  }),

  getHistoricoPorCliente: publicProcedure.input(z.object({ clienteId: z.string().uuid() })).query(async ({ input }) => {
    const historico = await db
      .select({
        id: agendamentos.id,
        dataHora: agendamentos.dataHora,
        servico: agendamentos.servico,
        status: agendamentos.status,
      })
      .from(agendamentos)
      .where(eq(agendamentos.clienteId, input.clienteId))
      .orderBy(desc(agendamentos.dataHora))

    return historico
  }),

  getFaturamentoPorCliente: publicProcedure.query(async () => {
    const resultado = await db
      .select({
        clienteId: agendamentos.clienteId,
        nome: clientes.nome,
        quantidade: sql<number>`COUNT(*)`,
        total: sql<number>`SUM(${agendamentos.valorCobrado})`,
      })
      .from(agendamentos)
      .innerJoin(clientes, eq(agendamentos.clienteId, clientes.id))
      .where(eq(agendamentos.status, "concluido"))
      .groupBy(agendamentos.clienteId, clientes.nome)
      .orderBy(desc(sql<number>`SUM(${agendamentos.valorCobrado})`))

    return resultado
  }),

  // Nova mutation para agendamento manual (admin)
  criarAgendamentoManual: publicProcedure
    .input(
      z.object({
        clienteId: z.string().uuid(),
        data: z.string(),
        horario: z.string(),
        servico: z.string(),
        status: z.enum(["agendado", "concluido", "cancelado"]),
      }),
    )
    .mutation(async ({ input }) => {
      const dataHora = dayjs(`${input.data}T${input.horario}`).toDate()

      const configuracao = await db.query.configuracoes.findFirst()
      if (!configuracao) throw new Error("Configuração não encontrada")

      const servicos = configuracao.servicos as ServicoConfigurado[]
      const servicoSelecionado = servicos.find((s) => s.nome === input.servico)

      if (!servicoSelecionado) {
        throw new Error(`Serviço "${input.servico}" não encontrado`)
      }

      const valorCobrado = servicoSelecionado.preco
      const duracaoMinutos = servicoSelecionado.duracaoMinutos ?? 30

      // Verificar conflitos apenas se o status for "agendado"
      if (input.status === "agendado") {
        const dataInicio = dayjs(`${input.data}T${input.horario}`)
        const dataFim = dataInicio.add(duracaoMinutos, "minute")

        const start = dataInicio.startOf("day").toDate()
        const end = dataInicio.endOf("day").toDate()

        const agendamentosExistentes = await db
          .select({
            dataHora: agendamentos.dataHora,
            duracaoMinutos: agendamentos.duracaoMinutos,
          })
          .from(agendamentos)
          .where(
            and(
              gte(agendamentos.dataHora, start),
              lte(agendamentos.dataHora, end),
              eq(agendamentos.status, "agendado"),
            ),
          )

        const temConflito = agendamentosExistentes.some((agendamento) => {
          const inicioExistente = dayjs(agendamento.dataHora)
          const fimExistente = inicioExistente.add(agendamento.duracaoMinutos, "minute")

          return dataInicio.isBefore(fimExistente) && dataFim.isAfter(inicioExistente)
        })

        if (temConflito) {
          throw new Error("Horário não disponível - conflita com outro agendamento")
        }
      }

      const result = await db
        .insert(agendamentos)
        .values({
          clienteId: input.clienteId,
          dataHora,
          servico: input.servico,
          status: input.status,
          valorCobrado,
          duracaoMinutos,
        })
        .returning({
          id: agendamentos.id,
        })

      return result[0]
    }),

  // Novo procedimento para buscar horários disponíveis baseado na data e serviço
  getHorariosDisponiveisPorData: publicProcedure
    .input(
      z.object({
        data: z.string(),
        servico: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const data = dayjs(input.data)
      const diaSemana = getDiaSemana(data.toDate()) as any

      // Buscar intervalos de trabalho para este dia
      const intervalos = await db.query.intervalosTrabalho.findMany({
        where: and(eq(intervalosTrabalho.diaSemana, diaSemana), eq(intervalosTrabalho.ativo, true)),
        orderBy: [intervalosTrabalho.horaInicio],
      })

      if (intervalos.length === 0) {
        return {
          horarios: [],
          intervalos: [],
          erro: "Estabelecimento fechado neste dia",
        }
      }

      // Buscar configuração para pegar duração do serviço
      const configuracao = await db.query.configuracoes.findFirst()
      if (!configuracao) {
        return { horarios: [], intervalos: [], erro: "Configuração não encontrada" }
      }

      const servicos = configuracao.servicos as ServicoConfigurado[]
      const servicoSelecionado = servicos.find((s) => s.nome === input.servico)
      if (!servicoSelecionado) {
        return { horarios: [], intervalos: [], erro: "Serviço não encontrado" }
      }

      const duracaoServico = servicoSelecionado.duracaoMinutos || 30

      // Gerar todos os horários possíveis dos intervalos (de 10 em 10 minutos)
      const horariosDisponiveis: string[] = []
      const intervalosInfo = intervalos.map((intervalo) => ({
        inicio: intervalo.horaInicio,
        fim: intervalo.horaFim,
      }))

      for (const intervalo of intervalos) {
        const [horaInicio, minutoInicio] = intervalo.horaInicio.split(":").map(Number)
        const [horaFim, minutoFim] = intervalo.horaFim.split(":").map(Number)

        const inicioMinutos = horaInicio! * 60 + minutoInicio!
        const fimMinutos = horaFim! * 60 + minutoFim!

        // Gerar horários de 10 em 10 minutos
        for (let minutos = inicioMinutos; minutos + duracaoServico <= fimMinutos; minutos += 10) {
          const hora = Math.floor(minutos / 60)
          const minuto = minutos % 60
          horariosDisponiveis.push(`${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`)
        }
      }

      // Buscar agendamentos existentes para este dia
      const start = data.startOf("day").toDate()
      const end = data.endOf("day").toDate()

      const agendamentosExistentes = await db
        .select({
          dataHora: agendamentos.dataHora,
          duracaoMinutos: agendamentos.duracaoMinutos,
        })
        .from(agendamentos)
        .where(
          and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end), eq(agendamentos.status, "agendado")),
        )

      // Filtrar horários ocupados e encontrar próximo disponível para cada horário
      const horariosComStatus = horariosDisponiveis.map((horario) => {
        const dataHorario = dayjs(`${input.data}T${horario}`)
        const fimNovoAgendamento = dataHorario.add(duracaoServico, "minute")

        // Verificar se há conflito com agendamentos existentes
        const temConflito = agendamentosExistentes.some((agendamento) => {
          const inicioAgendamento = dayjs(agendamento.dataHora)
          const fimAgendamento = inicioAgendamento.add(agendamento.duracaoMinutos, "minute")

          // Verifica se há sobreposição
          return dataHorario.isBefore(fimAgendamento) && fimNovoAgendamento.isAfter(inicioAgendamento)
        })

        let proximoDisponivel = null
        if (temConflito) {
          // Encontrar próximo horário disponível
          const horarioAtualIndex = horariosDisponiveis.indexOf(horario)
          for (let i = horarioAtualIndex + 1; i < horariosDisponiveis.length; i++) {
            const proximoHorario = horariosDisponiveis[i]!
            const proximaDataHorario = dayjs(`${input.data}T${proximoHorario}`)
            const proximoFim = proximaDataHorario.add(duracaoServico, "minute")

            const proximoTemConflito = agendamentosExistentes.some((agendamento) => {
              const inicioAgendamento = dayjs(agendamento.dataHora)
              const fimAgendamento = inicioAgendamento.add(agendamento.duracaoMinutos, "minute")

              return proximaDataHorario.isBefore(fimAgendamento) && proximoFim.isAfter(inicioAgendamento)
            })

            if (!proximoTemConflito) {
              proximoDisponivel = proximoHorario
              break
            }
          }
        }

        return {
          horario,
          disponivel: !temConflito,
          proximoDisponivel,
        }
      })

      return {
        horarios: horariosComStatus,
        intervalos: intervalosInfo,
        erro: null,
      }
    }),

  // Também adicionar um procedimento para verificar conflito específico
  verificarConflito: publicProcedure
    .input(
      z.object({
        data: z.string(),
        horario: z.string(),
        servico: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const dataHora = dayjs(`${input.data}T${input.horario}`)

      const configuracao = await db.query.configuracoes.findFirst()
      if (!configuracao) {
        return { temConflito: true, proximoDisponivel: null, erro: "Configuração não encontrada" }
      }

      const servicos = configuracao.servicos as ServicoConfigurado[]
      const servicoSelecionado = servicos.find((s) => s.nome === input.servico)
      if (!servicoSelecionado) {
        return { temConflito: true, proximoDisponivel: null, erro: "Serviço não encontrado" }
      }

      const duracaoServico = servicoSelecionado.duracaoMinutos || 30
      const fimAgendamento = dataHora.add(duracaoServico, "minute")

      // Buscar agendamentos existentes para este dia
      const start = dataHora.startOf("day").toDate()
      const end = dataHora.endOf("day").toDate()

      const agendamentosExistentes = await db
        .select({
          dataHora: agendamentos.dataHora,
          duracaoMinutos: agendamentos.duracaoMinutos,
        })
        .from(agendamentos)
        .where(
          and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end), eq(agendamentos.status, "agendado")),
        )

      const temConflito = agendamentosExistentes.some((agendamento) => {
        const inicioExistente = dayjs(agendamento.dataHora)
        const fimExistente = inicioExistente.add(agendamento.duracaoMinutos, "minute")

        return dataHora.isBefore(fimExistente) && fimAgendamento.isAfter(inicioExistente)
      })

      let proximoDisponivel = null
      if (temConflito) {
        // Buscar horários disponíveis para encontrar o próximo
        const { horarios } = await db.query.intervalosTrabalho
          .findMany({
            where: and(
              eq(intervalosTrabalho.diaSemana, getDiaSemana(dataHora.toDate()) as any),
              eq(intervalosTrabalho.ativo, true),
            ),
            orderBy: [intervalosTrabalho.horaInicio],
          })
          .then(async (intervalos) => {
            if (intervalos.length === 0) return { horarios: [] }

            const horariosDisponiveis: string[] = []
            for (const intervalo of intervalos) {
              const [horaInicio, minutoInicio] = intervalo.horaInicio.split(":").map(Number)
              const [horaFim, minutoFim] = intervalo.horaFim.split(":").map(Number)

              const inicioMinutos = horaInicio! * 60 + minutoInicio!
              const fimMinutos = horaFim! * 60 + minutoFim!

              for (let minutos = inicioMinutos; minutos + duracaoServico <= fimMinutos; minutos += 10) {
                const hora = Math.floor(minutos / 60)
                const minuto = minutos % 60
                horariosDisponiveis.push(`${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`)
              }
            }

            return { horarios: horariosDisponiveis }
          })

        // Encontrar próximo horário disponível após o horário solicitado
        const horarioSolicitado = input.horario
        const horariosPosteriores = horarios.filter((h) => h > horarioSolicitado)

        for (const horario of horariosPosteriores) {
          const testeDataHora = dayjs(`${input.data}T${horario}`)
          const testeFim = testeDataHora.add(duracaoServico, "minute")

          const testeConflito = agendamentosExistentes.some((agendamento) => {
            const inicioExistente = dayjs(agendamento.dataHora)
            const fimExistente = inicioExistente.add(agendamento.duracaoMinutos, "minute")

            return testeDataHora.isBefore(fimExistente) && testeFim.isAfter(inicioExistente)
          })

          if (!testeConflito) {
            proximoDisponivel = horario
            break
          }
        }
      }

      return {
        temConflito,
        proximoDisponivel,
        erro: null,
      }
    }),
    searchClienteByTelefone: publicProcedure
    .input(z.object({ telefone: z.string() }))
    .query(async ({ input }) => {
      const { telefone } = input;
      const formattedTelefone = formatPhoneNumber(telefone);

      const cliente = await prisma.cliente.findUnique({
        where: { telefone: formattedTelefone },
      });

      return cliente;
    }),

})


// Utility function to format phone numbers
function formatPhoneNumber(phoneNumber: string): string {
  // Implement phone number formatting logic here
  return phoneNumber.replace(/\D/g, ''); // Example: remove all non-digit characters
}