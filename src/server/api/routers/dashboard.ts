import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { agendamentos, clientes, conversations, messages } from "@/server/db/schema"
import { eq, gte, lte, and, desc, sql } from "drizzle-orm"
import dayjs from "dayjs"

// Tipos auxiliares para ajudar no typing dos resultados da query
type CountResult = { count: string | number }
type StatusCountResult = { status: string; count: string | number }
type AgendamentoPorDia = {
  dataDia: Date
  total: string | number
}
type FaturamentoResult = { total: number | null }

export const dashboardRouter = createTRPCRouter({
  // Total de agendamentos nos últimos 30 dias por dia (para gráfico)
  getAgendamentosUltimos30Dias: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const dataLimite = dayjs().subtract(30, "day").toDate()

    const agendamentosPorDia = await ctx.db
      .select({
        dataDia: sql`DATE("data_hora")`,
        total: sql`COUNT(*)`,
      })
      .from(agendamentos)
      .where(and(
        eq(agendamentos.userId, userId),
        gte(agendamentos.dataHora, dataLimite)
      ))
      .groupBy(sql`DATE("data_hora")`)
      .orderBy(sql`DATE("data_hora")`)

    return agendamentosPorDia
  }),

  // Total de agendamentos últimos 10 dias para overview gráfico
  getOverviewData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const dataLimite = dayjs().subtract(9, "day").startOf("day").toDate()

    const agendamentosPorDia = (await ctx.db
      .select({
        dataDia: sql`DATE("data_hora")`,
        total: sql`COUNT(*)`,
      })
      .from(agendamentos)
      .where(and(
        eq(agendamentos.userId, userId),
        gte(agendamentos.dataHora, dataLimite)
      ))
      .groupBy(sql`DATE("data_hora")`)
      .orderBy(sql`DATE("data_hora")`)) as AgendamentoPorDia[]

    // Mapear os dados para preencher dias sem agendamentos
    const resultadosMap = new Map<string, number>()
    agendamentosPorDia.forEach(({ dataDia, total }) => {
      const diaStr =
        dataDia instanceof Date ? dataDia.toISOString().slice(0, 10) : new Date(dataDia).toISOString().slice(0, 10)
      resultadosMap.set(diaStr, Number(total))
    })

    const resultadoCompleto = []
    for (let i = 0; i < 10; i++) {
      const dia = dayjs(dataLimite).add(i, "day").format("YYYY-MM-DD")
      resultadoCompleto.push({
        date: dia,
        total: resultadosMap.get(dia) ?? 0,
      })
    }

    return resultadoCompleto
  }),

  // Últimos 5 agendamentos com dados do cliente
  getUltimosAgendamentos: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;
      const agendamentosRecentes = await ctx.db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
          clienteNome: clientes.nome,
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .where(eq(agendamentos.userId, userId))
        .orderBy(desc(agendamentos.dataHora))
        .limit(5)

      // Garantir que todos os campos existem e não são null
      return agendamentosRecentes.map((agendamento) => ({
        id: agendamento.id,
        dataHora: agendamento.dataHora,
        servico: agendamento.servico ?? "Serviço não informado",
        status: agendamento.status || "pendente",
        clienteNome: agendamento.clienteNome ?? "Cliente não informado",
      }))
    } catch (error) {
      console.error("Erro ao buscar últimos agendamentos:", error)
      return []
    }
  }),

  // Estatísticas gerais com cálculos de variações percentuais entre períodos
  getStats: protectedProcedure.query(async ({ ctx }) => {
    function toNumber(value: unknown): number {
      if (typeof value === "string") return Number.parseFloat(value)
      if (typeof value === "number") return value
      return 0
    }

    try {
      const userId = ctx.user.id;

      // Datas para períodos atuais e anteriores
      const hojeInicio = dayjs().startOf("day").toDate()
      const hojeFim = dayjs().endOf("day").toDate()
      const ontemInicio = dayjs().subtract(1, "day").startOf("day").toDate()
      const ontemFim = dayjs().subtract(1, "day").endOf("day").toDate()

      const seteDiasAtras = dayjs().subtract(7, "day").startOf("day").toDate()
      const quatorzeDiasAtras = dayjs().subtract(14, "day").startOf("day").toDate()

      // Contagem total de clientes e agendamentos
      const totalClientesRes = (await ctx.db
        .select({ count: sql`COUNT(*)` })
        .from(clientes)
        .where(eq(clientes.userId, userId))
      ) as CountResult[]

      const totalAgendamentosRes = (await ctx.db
        .select({ count: sql`COUNT(*)` })
        .from(agendamentos)
        .where(eq(agendamentos.userId, userId))
      ) as CountResult[]

      // Agendamentos hoje (status "agendado")
      const agendamentosHojeRes = (await ctx.db
        .select({ count: sql`COUNT(*)` })
        .from(agendamentos)
        .where(
          and(
            eq(agendamentos.userId, userId),
            gte(agendamentos.dataHora, hojeInicio),
            lte(agendamentos.dataHora, hojeFim),
            eq(agendamentos.status, "agendado"),
          ),
        )) as CountResult[]

      // Agendamentos ontem (status "agendado") para comparação
      const agendamentosOntemRes = (await ctx.db
        .select({ count: sql`COUNT(*)` })
        .from(agendamentos)
        .where(
          and(
            eq(agendamentos.userId, userId),
            gte(agendamentos.dataHora, ontemInicio),
            lte(agendamentos.dataHora, ontemFim),
            eq(agendamentos.status, "agendado"),
          ),
        )) as CountResult[]

      // Novos clientes últimos 7 dias (atual)
      const novosClientesRes = (await ctx.db
        .select({ count: sql`COUNT(*)` })
        .from(clientes)
        .where(and(
          eq(clientes.userId, userId),
          gte(clientes.createdAt, seteDiasAtras)
        ))
      ) as CountResult[]

      // Novos clientes 7 dias anteriores (para comparação)
      const novosClientesSemanaAnteriorRes = (await ctx.db
        .select({ count: sql`COUNT(*)` })
        .from(clientes)
        .where(
          and(
            eq(clientes.userId, userId),
            gte(clientes.createdAt, quatorzeDiasAtras),
            lte(clientes.createdAt, seteDiasAtras)
          ),
        )) as CountResult[]

      // 📱 MENSAGENS WHATSAPP RECEBIDAS HOJE
      const mensagensHojeRes = (await ctx.db
        .select({ count: sql`COUNT(*)` })
        .from(messages)
        .leftJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.userId, userId),
            eq(messages.role, "user"), // Mensagens de clientes (não do sistema/bot)
            gte(messages.timestamp, hojeInicio),
            lte(messages.timestamp, hojeFim),
          ),
        )) as CountResult[]

      // Mensagens WhatsApp ontem (para comparação)
      const mensagensOntemRes = (await ctx.db
        .select({ count: sql`COUNT(*)` })
        .from(messages)
        .leftJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.userId, userId),
            eq(messages.role, "user"),
            gte(messages.timestamp, ontemInicio),
            lte(messages.timestamp, ontemFim),
          ),
        )) as CountResult[]

      // Faturamento últimos 7 dias (status "concluido") - CORRIGIDO
      // Verificar se a coluna valor_cobrado existe, senão usar um valor padrão
      const faturamento7DiasRes = (await ctx.db
        .select({
          total: sql<number>`COALESCE(SUM(CASE WHEN ${agendamentos.valorCobrado} IS NOT NULL THEN ${agendamentos.valorCobrado} ELSE 0 END), 0)`,
        })
        .from(agendamentos)
        .where(
          and(
            eq(agendamentos.userId, userId),
            gte(agendamentos.dataHora, seteDiasAtras),
            eq(agendamentos.status, "concluido")
          ),
        )) as FaturamentoResult[]

      // Faturamento 7 dias anteriores (status "concluido") para comparação - CORRIGIDO
      const faturamento7DiasAnterioresRes = (await ctx.db
        .select({
          total: sql<number>`COALESCE(SUM(CASE WHEN ${agendamentos.valorCobrado} IS NOT NULL THEN ${agendamentos.valorCobrado} ELSE 0 END), 0)`,
        })
        .from(agendamentos)
        .where(
          and(
            eq(agendamentos.userId, userId),
            gte(agendamentos.dataHora, quatorzeDiasAtras),
            lte(agendamentos.dataHora, seteDiasAtras),
            eq(agendamentos.status, "concluido"),
          ),
        )) as FaturamentoResult[]

      // Converter valores para número
      const totalClientes = toNumber(totalClientesRes?.[0]?.count)
      const totalAgendamentos = toNumber(totalAgendamentosRes?.[0]?.count)
      const agendamentosHoje = toNumber(agendamentosHojeRes?.[0]?.count)
      const agendamentosOntem = toNumber(agendamentosOntemRes?.[0]?.count)
      const novosClientes = toNumber(novosClientesRes?.[0]?.count)
      const novosClientesSemanaAnterior = toNumber(novosClientesSemanaAnteriorRes?.[0]?.count)
      const mensagensWhatsApp = toNumber(mensagensHojeRes?.[0]?.count)
      const mensagensOntem = toNumber(mensagensOntemRes?.[0]?.count)
      const faturamentoEstimado = faturamento7DiasRes?.[0]?.total ?? 0
      const faturamentoSemanaAnterior = faturamento7DiasAnterioresRes?.[0]?.total ?? 0

      // Função para cálculo da variação percentual (com proteção contra divisão por zero)
      function calcPercentual(atual: number, anterior: number): number {
        if (anterior === 0) {
          return atual === 0 ? 0 : 100 // Se anterior 0 e atual > 0, considera 100%
        }
        return ((atual - anterior) / anterior) * 100
      }

      const variacaoAgendamentos = calcPercentual(agendamentosHoje, agendamentosOntem)
      const variacaoNovosClientes = calcPercentual(novosClientes, novosClientesSemanaAnterior)
      const variacaoMensagens = calcPercentual(mensagensWhatsApp, mensagensOntem)
      const variacaoFaturamento = calcPercentual(faturamentoEstimado, faturamentoSemanaAnterior)

      // Contagem de agendamentos por status
      const statusCountsRes = (await ctx.db
        .select({
          status: agendamentos.status,
          count: sql`COUNT(*)`,
        })
        .from(agendamentos)
        .where(eq(agendamentos.userId, userId))
        .groupBy(agendamentos.status)) as StatusCountResult[]

      const statusMap: Record<string, number> = {}
      statusCountsRes.forEach(({ status, count }) => {
        statusMap[status] = toNumber(count)
      })

      return {
        totalClientes,
        totalAgendamentos,
        agendamentosPorStatus: statusMap,
        agendamentosHoje,
        novosClientes,
        mensagensWhatsApp, // ✅ Agora implementado!
        faturamentoEstimado,

        // Variações percentuais para o frontend exibir
        variacaoAgendamentos,
        variacaoNovosClientes,
        variacaoMensagens, // ✅ Nova variação adicionada
        variacaoFaturamento,
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas do dashboard:", error)
      return {
        totalClientes: 0,
        totalAgendamentos: 0,
        agendamentosPorStatus: {},
        agendamentosHoje: 0,
        novosClientes: 0,
        mensagensWhatsApp: 0,
        faturamentoEstimado: 0,
        variacaoAgendamentos: 0,
        variacaoNovosClientes: 0,
        variacaoMensagens: 0,
        variacaoFaturamento: 0,
      }
    }
  }),
})
