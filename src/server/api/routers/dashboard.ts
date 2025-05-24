import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { agendamentos, clientes } from "@/server/db/schema";
import { eq, gte, lte, and, desc, sql } from "drizzle-orm";
import dayjs from "dayjs";

type CountResult = { count: string | number };
type StatusCountResult = { status: string; count: string | number };

// Tipo para o resultado da query com dataDia
type AgendamentoPorDia = {
  dataDia: Date; // assume que o SQL DATE retorna Date, pode precisar ajustar conforme seu driver
  total: string | number;
};

export const dashboardRouter = createTRPCRouter({
  // Total de agendamentos nos últimos 30 dias
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

  // Total de agendamentos dos últimos 10 dias para gráfico
  getOverviewData: publicProcedure.query(async ({ ctx }) => {
    const dataLimite = dayjs().subtract(9, "day").startOf("day").toDate(); // últimos 10 dias incluindo hoje

    // Executa a query com tipo explícito para o resultado
    const agendamentosPorDia = (await ctx.db
      .select({
        dataDia: sql`DATE("data_hora")`,
        total: sql`COUNT(*)`,
      })
      .from(agendamentos)
      .where(gte(agendamentos.dataHora, dataLimite))
      .groupBy(sql`DATE("data_hora")`)
      .orderBy(sql`DATE("data_hora")`)) as AgendamentoPorDia[];

    // Mapear para preencher dias sem agendamento com total 0
    const resultadosMap = new Map<string, number>();

    agendamentosPorDia.forEach(({ dataDia, total }) => {
      // Garantir que dataDia seja Date, caso seja string, converter para Date
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

  // Últimos 5 agendamentos recentes com cliente
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

  // Estatísticas gerais
  getStats: publicProcedure.query(async ({ ctx }) => {
    function toNumber(value: unknown): number {
      if (typeof value === "string") return parseInt(value, 10);
      if (typeof value === "number") return value;
      return 0;
    }

    const hojeInicio = dayjs().startOf("day").toDate();
    const hojeFim = dayjs().endOf("day").toDate();
    const seteDiasAtras = dayjs().subtract(7, "day").startOf("day").toDate();

    const totalClientesRes = (await ctx.db
      .select({ count: sql`COUNT(*)` })
      .from(clientes)) as CountResult[];

    const totalAgendamentosRes = (await ctx.db
      .select({ count: sql`COUNT(*)` })
      .from(agendamentos)) as CountResult[];

    const statusCountsRes = (await ctx.db
      .select({
        status: agendamentos.status,
        count: sql`COUNT(*)`,
      })
      .from(agendamentos)
      .groupBy(agendamentos.status)) as StatusCountResult[];

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

    const novosClientesRes = (await ctx.db
      .select({ count: sql`COUNT(*)` })
      .from(clientes)
      .where(gte(clientes.createdAt, seteDiasAtras))) as CountResult[];

    const mensagensWhatsApp = 0;
    const faturamentoEstimado = 0;

    const totalClientes = totalClientesRes?.[0] ? toNumber(totalClientesRes[0].count) : 0;
    const totalAgendamentos = totalAgendamentosRes?.[0] ? toNumber(totalAgendamentosRes[0].count) : 0;
    const agendamentosHoje = agendamentosHojeRes?.[0] ? toNumber(agendamentosHojeRes[0].count) : 0;
    const novosClientes = novosClientesRes?.[0] ? toNumber(novosClientesRes[0].count) : 0;

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
      mensagensWhatsApp,
      faturamentoEstimado,
    };
  }),
});