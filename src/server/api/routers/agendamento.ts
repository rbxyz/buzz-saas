import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { agendamentos, clientes } from "@/server/db/schema";
import { eq, and, gte, lte, or, like } from "drizzle-orm";
import dayjs from "dayjs";
import {sql} from "drizzle-orm";

export const agendamentoRouter = createTRPCRouter({
  getByData: publicProcedure
    .input(z.object({ date: z.string() })) // ISO string
    .query(async ({ input }) => {
      const start = dayjs(input.date).startOf("day").toDate();
      const end = dayjs(input.date).endOf("day").toDate();

      const agendamentosDoDia = await db
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
            gte(agendamentos.dataHora, start),
            lte(agendamentos.dataHora, end)
          )
        );

      return agendamentosDoDia;
    }),

  create: publicProcedure
    .input(
      z.object({
        clienteId: z.string().uuid(),
        data: z.string(), // Ex: "2025-05-21"
        horario: z.string(), // Ex: "14:30"
        servico: z.string(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
      })
    )
    .mutation(async ({ input }) => {
      const dataHora = dayjs(`${input.data}T${input.horario}`).toDate();

      // Inserção: id UUID será gerado automaticamente pelo banco
      const result = await db.insert(agendamentos).values({
        clienteId: input.clienteId,
        dataHora,
        servico: input.servico,
        status: input.status,
      }).returning({
        id: agendamentos.id,
      });

      return result[0]; // Retorna o novo agendamento criado com o id gerado
    }),

  atualizarStatus: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(agendamentos)
        .set({ status: input.status })
        .where(eq(agendamentos.id, input.id))
        .returning();

      return result[0]; // Retorna o agendamento atualizado
    }),

    // Busca cliente pelo código (ID ou parte do nome) - pode ajustar filtro depois
    getByClientCode: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const searchTerm = `%${input.query.toLowerCase()}%`;

      const clientesEncontrados = await db
        .select({
          id: clientes.id,
          nome: clientes.nome,
        })
        .from(clientes)
        .where(
          or(
            eq(clientes.id, input.query), // busca exata por UUID, caso query seja um ID
            sql`LOWER(${clientes.nome}) LIKE ${searchTerm}`
          )
        )
        .limit(10);

      return clientesEncontrados;
    }),
});
