import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { configuracoes } from "@/server/db/schema"
import { eq } from "drizzle-orm"

export const configuracaoRouter = createTRPCRouter({
  listar: publicProcedure.query(async () => {
    const resultado = await db.query.configuracoes.findFirst()
    return resultado
  }),

  salvar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        nome: z.string(),
        telefone: z.string(),
        endereco: z.string(),
        instanceId: z.string(),
        token: z.string(),
        whatsappAtivo: z.boolean(),
        modoTreinoAtivo: z.boolean(),
        contextoIA: z.string(),
        dadosIA: z.string(),
        servicos: z.array(
          z.object({
            nome: z.string(),
            preco: z.number(),
            duracaoMinutos: z.number().optional(),
          }),
        ),
        diasAntecedenciaAgendamento: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const now = new Date()

      const existente = await db.query.configuracoes.findFirst()

      if (existente) {
        await db
          .update(configuracoes)
          .set({
            nome: input.nome,
            telefone: input.telefone,
            endereco: input.endereco,
            instanceId: input.instanceId,
            token: input.token,
            whatsappAtivo: input.whatsappAtivo,
            modoTreinoAtivo: input.modoTreinoAtivo,
            contextoIA: input.contextoIA,
            dadosIA: input.dadosIA,
            servicos: input.servicos,
            diasAntecedenciaAgendamento: input.diasAntecedenciaAgendamento ?? 30,
            updatedAt: now,
          })
          .where(eq(configuracoes.id, existente.id))

        return { ok: true, tipo: "atualizado" }
      }

      await db.insert(configuracoes).values({
        nome: input.nome,
        telefone: input.telefone,
        endereco: input.endereco,
        instanceId: input.instanceId,
        token: input.token,
        whatsappAtivo: input.whatsappAtivo,
        modoTreinoAtivo: input.modoTreinoAtivo,
        contextoIA: input.contextoIA,
        dadosIA: input.dadosIA,
        servicos: input.servicos,
        diasAntecedenciaAgendamento: input.diasAntecedenciaAgendamento ?? 30,
        createdAt: now,
        updatedAt: now,
      })

      return { ok: true, tipo: "criado" }
    }),

  atualizarConfiguracao: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().optional(),
        telefone: z.string().optional(),
        endereco: z.string().optional(),
        diasAntecedenciaAgendamento: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...dadosAtualizar } = input

      if (Object.keys(dadosAtualizar).length === 0) {
        throw new Error("Nenhum campo para atualizar.")
      }

      await db
        .update(configuracoes)
        .set({
          ...dadosAtualizar,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, id))

      return { ok: true }
    }),

  atualizarIntegracaoWhatsapp: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        instanceId: z.string(),
        token: z.string(),
        whatsappAtivo: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          instanceId: input.instanceId,
          token: input.token,
          whatsappAtivo: input.whatsappAtivo,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id))
      return { ok: true }
    }),

  atualizarModoTreino: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        modoTreinoAtivo: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          modoTreinoAtivo: input.modoTreinoAtivo,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id))
      return { ok: true }
    }),

  atualizarIA: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        contextoIA: z.string(),
        dadosIA: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          contextoIA: input.contextoIA,
          dadosIA: input.dadosIA,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id))
      return { ok: true }
    }),

  atualizarServicos: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        servicos: z
          .array(
            z.object({
              nome: z.string(),
              preco: z.number(),
              duracaoMinutos: z.number().optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          servicos: input.servicos,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id))
      return { ok: true }
    }),

  getServicos: publicProcedure.query(async () => {
    const resultado = await db.query.configuracoes.findFirst()
    if (!resultado) return []
    return resultado.servicos ?? []
  }),
})
