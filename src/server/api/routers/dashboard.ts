import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { agendamentos, clientes } from "@/server/db/schema";
import { eq, gte, lte, and, desc, sql } from "drizzle-orm";
import dayjs from "dayjs";

// Tipos auxiliares para ajudar no typing dos resultados da query
type CountResult = { count: string | number };
type StatusCountResult = { status: string; count: string | number };
type AgendamentoPorDia = {
  dataDia: Date;
  total: string | number;
};
type FaturamentoResult = { total: number | null };

export const dashboardRouter = createTRPCRouter({
  // Total de agendamentos nos últimos 30 dias por dia (para gráfico)
  getAgendamentosUltimos30Dias: publicProcedure.query(async ({ ctx }) => {
    const dataLimite = dayjs().subtract(30, "day").toDate();

    const agendamentosPorDia = await ctx.db
      .select({
        dataDia: sql`DATE("data_hora")`,
        total: sql`COUNT(*)`,
      })
      .from(agendamentos)
      .where(gte(agendamentos.dataHora, dataLimite))
      .groupBy(sql`DATE("data_hora")`)
      .orderBy(sql`DATE("data_hora")`);

    return agendamentosPorDia;
  }),

  // Total de agendamentos últimos 10 dias para overview gráfico
  getOverviewData: publicProcedure.query(async ({ ctx }) => {
    const dataLimite = dayjs().subtract(9, "day").startOf("day").toDate();

    const agendamentosPorDia = (await ctx.db
      .select({
        dataDia: sql`DATE("data_hora")`,
        total: sql`COUNT(*)`,
      })
      .from(agendamentos)
      .where(gte(agendamentos.dataHora, dataLimite))
      .groupBy(sql`DATE("data_hora")`)
      .orderBy(sql`DATE("data_hora")`)) as AgendamentoPorDia[];

    // Mapear os dados para preencher dias sem agendamentos
    const resultadosMap = new Map<string, number>();
    agendamentosPorDia.forEach(({ dataDia, total }) => {
      const diaStr =
        dataDia instanceof Date
          ? dataDia.toISOString().slice(0, 10)
          : new Date(dataDia).toISOString().slice(0, 10);
      resultadosMap.set(diaStr, Number(total));
    });

    const resultadoCompleto = [];
    for (let i = 0; i < 10; i++) {
      const dia = dayjs(dataLimite).add(i, "day").format("YYYY-MM-DD");
      resultadoCompleto.push({
        date: dia,
        total: resultadosMap.get(dia) ?? 0,
      });
    }

    return resultadoCompleto;
  }),

  // Últimos 5 agendamentos com dados do cliente
  getUltimosAgendamentos: publicProcedure.query(async ({ ctx }) => {
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
      .orderBy(desc(agendamentos.dataHora))
      .limit(5);

    return agendamentosRecentes;
  }),

  // Estatísticas gerais com cálculos de variações percentuais entre períodos
  getStats: publicProcedure.query(async ({ ctx }) => {
    function toNumber(value: unknown): number {
      if (typeof value === "string") return parseFloat(value);
      if (typeof value === "number") return value;
      return 0;
    }

    // Datas para períodos atuais e anteriores
    const hojeInicio = dayjs().startOf("day").toDate();
    const hojeFim = dayjs().endOf("day").toDate();
    const ontemInicio = dayjs().subtract(1, "day").startOf("day").toDate();
    const ontemFim = dayjs().subtract(1, "day").endOf("day").toDate();

    const seteDiasAtras = dayjs().subtract(7, "day").startOf("day").toDate();
    const quatorzeDiasAtras = dayjs().subtract(14, "day").startOf("day").toDate();

    // Contagem total de clientes e agendamentos
    const totalClientesRes = (await ctx.db.select({ count: sql`COUNT(*)` }).from(clientes)) as CountResult[];
    const totalAgendamentosRes = (await ctx.db.select({ count: sql`COUNT(*)` }).from(agendamentos)) as CountResult[];

    // Agendamentos hoje (status "agendado")
    const agendamentosHojeRes = (await ctx.db
      .select({ count: sql`COUNT(*)` })
      .from(agendamentos)
      .where(
        and(
          gte(agendamentos.dataHora, hojeInicio),
          lte(agendamentos.dataHora, hojeFim),
          eq(agendamentos.status, "agendado")
        )
      )) as CountResult[];

    // Agendamentos ontem (status "agendado") para comparação
    const agendamentosOntemRes = (await ctx.db
      .select({ count: sql`COUNT(*)` })
      .from(agendamentos)
      .where(
        and(
          gte(agendamentos.dataHora, ontemInicio),
          lte(agendamentos.dataHora, ontemFim),
          eq(agendamentos.status, "agendado")
        )
      )) as CountResult[];

    // Novos clientes últimos 7 dias (atual)
    const novosClientesRes = (await ctx.db
      .select({ count: sql`COUNT(*)` })
      .from(clientes)
      .where(gte(clientes.createdAt, seteDiasAtras))) as CountResult[];

    // Novos clientes 7 dias anteriores (para comparação)
    const novosClientesSemanaAnteriorRes = (await ctx.db
      .select({ count: sql`COUNT(*)` })
      .from(clientes)
      .where(
        and(
          gte(clientes.createdAt, quatorzeDiasAtras),
          lte(clientes.createdAt, seteDiasAtras)
        )
      )) as CountResult[];

    // Faturamento últimos 7 dias (status "concluido")
    const faturamento7DiasRes = (await ctx.db
      .select({ total: sql<number>`SUM(${agendamentos.valorCobrado})` })
      .from(agendamentos)
      .where(
        and(
          gte(agendamentos.dataHora, seteDiasAtras),
          eq(agendamentos.status, "concluido")
        )
      )) as FaturamentoResult[];

    // Faturamento 7 dias anteriores (status "concluido") para comparação
    const faturamento7DiasAnterioresRes = (await ctx.db
      .select({ total: sql<number>`SUM(${agendamentos.valorCobrado})` })
      .from(agendamentos)
      .where(
        and(
          gte(agendamentos.dataHora, quatorzeDiasAtras),
          lte(agendamentos.dataHora, seteDiasAtras),
          eq(agendamentos.status, "concluido")
        )
      )) as FaturamentoResult[];

    // Converter valores para número
    const totalClientes = toNumber(totalClientesRes?.[0]?.count);
    const totalAgendamentos = toNumber(totalAgendamentosRes?.[0]?.count);
    const agendamentosHoje = toNumber(agendamentosHojeRes?.[0]?.count);
    const agendamentosOntem = toNumber(agendamentosOntemRes?.[0]?.count);
    const novosClientes = toNumber(novosClientesRes?.[0]?.count);
    const novosClientesSemanaAnterior = toNumber(novosClientesSemanaAnteriorRes?.[0]?.count);
    const faturamentoEstimado = faturamento7DiasRes?.[0]?.total ?? 0;
    const faturamentoSemanaAnterior = faturamento7DiasAnterioresRes?.[0]?.total ?? 0;

    // Função para cálculo da variação percentual (com proteção contra divisão por zero)
    function calcPercentual(atual: number, anterior: number): number {
      if (anterior === 0) {
        return atual === 0 ? 0 : 100; // Se anterior 0 e atual > 0, considera 100%
      }
      return ((atual - anterior) / anterior) * 100;
    }

    const variacaoAgendamentos = calcPercentual(agendamentosHoje, agendamentosOntem);
    const variacaoNovosClientes = calcPercentual(novosClientes, novosClientesSemanaAnterior);
    const variacaoFaturamento = calcPercentual(faturamentoEstimado, faturamentoSemanaAnterior);

    // Contagem de agendamentos por status
    const statusCountsRes = (await ctx.db
      .select({
        status: agendamentos.status,
        count: sql`COUNT(*)`,
      })
      .from(agendamentos)
      .groupBy(agendamentos.status)) as StatusCountResult[];

    const statusMap: Record<string, number> = {};
    statusCountsRes.forEach(({ status, count }) => {
      statusMap[status] = toNumber(count);
    });

    return {
      totalClientes,
      totalAgendamentos,
      agendamentosPorStatus: statusMap,
      agendamentosHoje,
      novosClientes,
      mensagensWhatsApp: 0, // Pode implementar depois a contagem real
      faturamentoEstimado,

      // Variações percentuais para o frontend exibir
      variacaoAgendamentos,
      variacaoNovosClientes,
      variacaoFaturamento,
    };
  }),
});
