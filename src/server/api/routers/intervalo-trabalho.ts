import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { db } from "@/server/db"
import { intervalosTrabalho } from "@/server/db/schema"
import { eq, and } from "drizzle-orm"

// Mapeamento de dias da semana
const diasSemanaMap = {
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
  domingo: 0,
} as const

const diasSemanaReverseMap = {
  0: "domingo",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado",
} as const

const diasSemanaEnumZod = z.enum(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"])

export const intervalosTrabalhoRouter = createTRPCRouter({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id

    const intervalos = await db.query.intervalosTrabalho.findMany({
      where: and(
        eq(intervalosTrabalho.userId, userId),
        eq(intervalosTrabalho.ativo, true)
      ),
      orderBy: [intervalosTrabalho.diaSemana, intervalosTrabalho.horaInicio],
    })

    // Converter números de volta para nomes dos dias para compatibilidade com o componente
    return intervalos.map((intervalo) => ({
      ...intervalo,
      diaSemana: diasSemanaReverseMap[intervalo.diaSemana as keyof typeof diasSemanaReverseMap],
      turno: "manha" as const, // Valor padrão para compatibilidade
    }))
  }),

  salvarIntervalos: protectedProcedure
    .input(
      z.object({
        diaSemana: diasSemanaEnumZod,
        intervalos: z.array(
          z.object({
            horaInicio: z.string(),
            horaFim: z.string(),
            turno: z.enum(["manha", "tarde", "noite"]).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id
        console.log("💾 Salvando intervalos para userId:", userId, "dia:", input.diaSemana)

        // Converter o nome do dia para número
        const diaSemanaNumero = diasSemanaMap[input.diaSemana]

        console.log("🔢 Dia da semana convertido:", input.diaSemana, "->", diaSemanaNumero)

        // Primeiro, desativar todos os intervalos existentes para este dia e usuário
        await db
          .update(intervalosTrabalho)
          .set({ ativo: false, updatedAt: new Date() })
          .where(and(
            eq(intervalosTrabalho.userId, userId),
            eq(intervalosTrabalho.diaSemana, diaSemanaNumero)
          ))

        // Depois, criar os novos intervalos
        if (input.intervalos.length > 0) {
          await db.insert(intervalosTrabalho).values(
            input.intervalos.map((intervalo) => ({
              userId,
              diaSemana: diaSemanaNumero,
              horaInicio: intervalo.horaInicio,
              horaFim: intervalo.horaFim,
            })),
          )
        }

        console.log("✅ Intervalos salvos com sucesso!")
        return { success: true }
      } catch (error) {
        console.error("❌ Erro ao salvar intervalos:", error)
        throw new Error("Erro ao salvar intervalos de trabalho")
      }
    }),

  obterPorDia: protectedProcedure
    .input(z.object({ diaSemana: diasSemanaEnumZod }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const diaSemanaNumero = diasSemanaMap[input.diaSemana]

      const intervalos = await db.query.intervalosTrabalho.findMany({
        where: and(
          eq(intervalosTrabalho.userId, userId),
          eq(intervalosTrabalho.diaSemana, diaSemanaNumero),
          eq(intervalosTrabalho.ativo, true)
        ),
        orderBy: [intervalosTrabalho.horaInicio],
      })

      return intervalos.map((intervalo) => ({
        ...intervalo,
        diaSemana: input.diaSemana,
        turno: "manha" as const, // Valor padrão para compatibilidade
      }))
    }),

  listarPorDia: protectedProcedure
    .input(z.object({ diaSemana: diasSemanaEnumZod }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const diaSemanaNumero = diasSemanaMap[input.diaSemana]

      const intervalos = await db.query.intervalosTrabalho.findMany({
        where: and(
          eq(intervalosTrabalho.userId, userId),
          eq(intervalosTrabalho.diaSemana, diaSemanaNumero),
          eq(intervalosTrabalho.ativo, true)
        ),
        orderBy: [intervalosTrabalho.horaInicio],
      })

      return intervalos.map((intervalo) => ({
        ...intervalo,
        diaSemana: input.diaSemana,
        turno: "manha" as const,
      }))
    }),

  criar: protectedProcedure
    .input(
      z.object({
        diaSemana: diasSemanaEnumZod,
        horaInicio: z.string(),
        horaFim: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const diaSemanaNumero = diasSemanaMap[input.diaSemana]

      // Validar se não há sobreposição
      const intervalosExistentes = await db.query.intervalosTrabalho.findMany({
        where: and(
          eq(intervalosTrabalho.userId, userId),
          eq(intervalosTrabalho.diaSemana, diaSemanaNumero),
          eq(intervalosTrabalho.ativo, true)
        ),
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
          userId,
          diaSemana: diaSemanaNumero,
          horaInicio: input.horaInicio,
          horaFim: input.horaFim,
        })
        .returning()

      return result[0]
    }),

  atualizar: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        horaInicio: z.string().optional(),
        horaFim: z.string().optional(),
        ativo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { id, ...dadosAtualizar } = input

      const result = await db
        .update(intervalosTrabalho)
        .set({
          ...dadosAtualizar,
          updatedAt: new Date(),
        })
        .where(and(
          eq(intervalosTrabalho.id, id),
          eq(intervalosTrabalho.userId, userId)
        ))
        .returning()

      return result[0]
    }),

  remover: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      await db
        .update(intervalosTrabalho)
        .set({ ativo: false, updatedAt: new Date() })
        .where(and(
          eq(intervalosTrabalho.id, input.id),
          eq(intervalosTrabalho.userId, userId)
        ))

      return { success: true }
    }),
})
