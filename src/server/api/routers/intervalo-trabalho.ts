import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { intervalosTrabalho } from "@/server/db/schema"
import { eq, and } from "drizzle-orm"

const diasSemanaEnumZod = z.enum(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"])

const turnoEnumZod = z.enum(["manha", "tarde", "noite"])

export const intervalosTrabalhoRouter = createTRPCRouter({
  listar: publicProcedure.query(async () => {
    const intervalos = await db.query.intervalosTrabalho.findMany({
      where: eq(intervalosTrabalho.ativo, true),
      orderBy: [intervalosTrabalho.diaSemana, intervalosTrabalho.horaInicio],
    })
    return intervalos
  }),

  listarPorDia: publicProcedure.input(z.object({ diaSemana: diasSemanaEnumZod })).query(async ({ input }) => {
    const intervalos = await db.query.intervalosTrabalho.findMany({
      where: and(eq(intervalosTrabalho.diaSemana, input.diaSemana), eq(intervalosTrabalho.ativo, true)),
      orderBy: [intervalosTrabalho.horaInicio],
    })
    return intervalos
  }),

  criar: publicProcedure
    .input(
      z.object({
        diaSemana: diasSemanaEnumZod,
        horaInicio: z.string(),
        horaFim: z.string(),
        turno: turnoEnumZod,
      }),
    )
    .mutation(async ({ input }) => {
      // Validar se não há sobreposição
      const intervalosExistentes = await db.query.intervalosTrabalho.findMany({
        where: and(eq(intervalosTrabalho.diaSemana, input.diaSemana), eq(intervalosTrabalho.ativo, true)),
      })

      // Verificar sobreposição
      const horaInicioNova = input.horaInicio
      const horaFimNova = input.horaFim

      for (const intervalo of intervalosExistentes) {
        if (
          (horaInicioNova >= intervalo.horaInicio && horaInicioNova < intervalo.horaFim) ||
          (horaFimNova > intervalo.horaInicio && horaFimNova <= intervalo.horaFim) ||
          (horaInicioNova <= intervalo.horaInicio && horaFimNova >= intervalo.horaFim)
        ) {
          throw new Error(`Intervalo se sobrepõe com ${intervalo.horaInicio}-${intervalo.horaFim}`)
        }
      }

      const result = await db
        .insert(intervalosTrabalho)
        .values({
          diaSemana: input.diaSemana,
          horaInicio: input.horaInicio,
          horaFim: input.horaFim,
          turno: input.turno,
        })
        .returning()

      return result[0]
    }),

  atualizar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        horaInicio: z.string().optional(),
        horaFim: z.string().optional(),
        turno: turnoEnumZod.optional(),
        ativo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...dadosAtualizar } = input

      const result = await db
        .update(intervalosTrabalho)
        .set({
          ...dadosAtualizar,
          updatedAt: new Date(),
        })
        .where(eq(intervalosTrabalho.id, id))
        .returning()

      return result[0]
    }),

  remover: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    await db
      .update(intervalosTrabalho)
      .set({ ativo: false, updatedAt: new Date() })
      .where(eq(intervalosTrabalho.id, input.id))

    return { success: true }
  }),

  salvarIntervalos: publicProcedure
    .input(
      z.object({
        diaSemana: diasSemanaEnumZod,
        intervalos: z.array(
          z.object({
            horaInicio: z.string(),
            horaFim: z.string(),
            turno: turnoEnumZod,
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      // Primeiro, desativar todos os intervalos existentes para este dia
      await db
        .update(intervalosTrabalho)
        .set({ ativo: false, updatedAt: new Date() })
        .where(eq(intervalosTrabalho.diaSemana, input.diaSemana))

      // Depois, criar os novos intervalos
      if (input.intervalos.length > 0) {
        await db.insert(intervalosTrabalho).values(
          input.intervalos.map((intervalo) => ({
            diaSemana: input.diaSemana,
            horaInicio: intervalo.horaInicio,
            horaFim: intervalo.horaFim,
            turno: intervalo.turno,
          })),
        )
      }

      return { success: true }
    }),
})
