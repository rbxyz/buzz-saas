import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { z } from "zod"
import { agents } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { sql } from "drizzle-orm"

const AgentSchema = z.object({
  nome: z.string().min(1).max(255),
  descricao: z.string().max(1000).optional(),
  modelo: z.string().max(50).optional(),
  temperatura: z.number().min(0).max(1).optional(),
  ativo: z.boolean().optional(),
  promptSistema: z.string().optional(),
})

export const agentsRouter = createTRPCRouter({
  create: protectedProcedure.input(AgentSchema).mutation(async ({ ctx, input }) => {
    const agent = await ctx.db
      .insert(agents)
      .values(input)
      .returning()
      .then((rows) => rows[0])
    return agent
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const allAgents = await ctx.db.select().from(agents)
    return allAgents
  }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const activeAgents = await ctx.db.select().from(agents).where(eq(agents.ativo, true))
    return activeAgents
  }),

  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const agent = await ctx.db
      .select()
      .from(agents)
      .where(eq(agents.id, input.id))
      .then((rows) => rows[0] ?? null)
    return agent
  }),

  update: protectedProcedure.input(AgentSchema.extend({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input
    const updatedAgent = await ctx.db
      .update(agents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id))
      .returning()
      .then((rows) => rows[0])
    return updatedAgent
  }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid(), ativo: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const updatedAgent = await ctx.db
        .update(agents)
        .set({
          ativo: input.ativo,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, input.id))
        .returning()
        .then((rows) => rows[0])
      return updatedAgent
    }),

  incrementQueryCount: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const updatedAgent = await ctx.db
        .update(agents)
        .set({
          contadorConsultas: sql`${agents.contadorConsultas} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, input.id))
        .returning()
        .then((rows) => rows[0])
      return updatedAgent
    }),

  updateTrainingDate: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const updatedAgent = await ctx.db
      .update(agents)
      .set({
        ultimoTreinamento: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agents.id, input.id))
      .returning()
      .then((rows) => rows[0])
    return updatedAgent
  }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(agents).where(eq(agents.id, input.id))
    return { success: true }
  }),
})
