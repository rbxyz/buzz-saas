import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { agendamentos, clientes } from "@/server/db/schema";

export const relatorioRouter = createTRPCRouter({
  dashboard: publicProcedure.query(async () => {
    const totalClientes = await db.select().from(clientes);
    const totalAgendamentos = await db.select().from(agendamentos);

    const agendados = totalAgendamentos.filter((a) => a.status === "agendado").length;
    const concluidos = totalAgendamentos.filter((a) => a.status === "concluido").length;

    return {
      totalClientes: totalClientes.length,
      totalAgendamentos: totalAgendamentos.length,
      agendados,
      concluidos,
    };
  }),
});
