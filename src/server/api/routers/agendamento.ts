import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { agendamentos } from "@/server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import dayjs from "dayjs";

export const agendamentoRouter = createTRPCRouter({
  getByData: publicProcedure
    .input(z.object({ dia: z.string() })) // formato YYYY-MM-DD
    .query(async ({ input }) => {
      const start = dayjs(input.dia).startOf("day").toDate();
      const end = dayjs(input.dia).endOf("day").toDate();
      return db.query.agendamentos.findMany({
        where: and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end)),
      });
    }),

  criar: publicProcedure
    .input(z.object({
      clienteId: z.string().uuid(),
      dataHora: z.string().datetime(),
      servico: z.string(),
    }))
    .mutation(async ({ input }) => {
      const existente = await db.query.agendamentos.findFirst({
        where: eq(agendamentos.dataHora, new Date(input.dataHora)),
      });

      if (existente) {
        throw new Error("Horário indisponível");
      }

      return db.insert(agendamentos).values({
        ...input,
        status: "agendado",
      });
    }),

  atualizarStatus: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["agendado", "cancelado", "concluido"]),
    }))
    .mutation(async ({ input }) => {
      return db.update(agendamentos)
        .set({ status: input.status })
        .where(eq(agendamentos.id, input.id));
    }),
});
