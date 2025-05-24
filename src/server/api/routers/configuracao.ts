import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { configuracoes } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const configuracaoRouter = createTRPCRouter({
  // Lista a única configuração (ou a primeira encontrada)
  listar: publicProcedure.query(async () => {
    const resultado = await db.query.configuracoes.findFirst();
    return resultado;
  }),
  salvar: publicProcedure
  .input(
    z.object({
      id: z.string().uuid().optional(), // opcional para criação
      nome: z.string(),
      telefone: z.string(),
      endereco: z.string(),
      dias: z.string(),
      horaInicio: z.string(),
      horaFim: z.string(),
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
        })
      ),
    })
  )
  .mutation(async ({ input }) => {
    const now = new Date();

    // Se já existe configuração, atualiza
    const existente = await db.query.configuracoes.findFirst();

    if (existente) {
      await db
        .update(configuracoes)
        .set({
          nome: input.nome,
          telefone: input.telefone,
          endereco: input.endereco,
          dias: input.dias,
          horaInicio: input.horaInicio,
          horaFim: input.horaFim,
          instanceId: input.instanceId,
          token: input.token,
          whatsappAtivo: input.whatsappAtivo,
          modoTreinoAtivo: input.modoTreinoAtivo,
          contextoIA: input.contextoIA,
          dadosIA: input.dadosIA,
          servicos: input.servicos,
          updatedAt: now,
        })
        .where(eq(configuracoes.id, existente.id));

      return { ok: true, tipo: "atualizado" };
    }

    // Senão, insere novo
    await db.insert(configuracoes).values({
      nome: input.nome,
      telefone: input.telefone,
      endereco: input.endereco,
      dias: input.dias,
      horaInicio: input.horaInicio,
      horaFim: input.horaFim,
      instanceId: input.instanceId,
      token: input.token,
      whatsappAtivo: input.whatsappAtivo,
      modoTreinoAtivo: input.modoTreinoAtivo,
      contextoIA: input.contextoIA,
      dadosIA: input.dadosIA,
      servicos: input.servicos,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, tipo: "criado" };
  }),

  salvaServicos: publicProcedure
  .input(
    z.object({
      id: z.string(), // ID da configuração
      servicos: z
        .array(
          z.object({
            nome: z.string().min(1),
            preco: z.string().min(1),
          }),
        )
        .min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { id, servicos } = input;
      await db
      .update(configuracoes)
      .set({
        servicos,
        updatedAt: new Date(),
      })
      .where(eq(configuracoes.id, id));
    return { ok: true };
    }),

  // Atualiza a configuração (única)
  atualizar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string(),
        telefone: z.string(),
        endereco: z.string(),
        dias: z.string(),
        horaInicio: z.string(),
        horaFim: z.string(),
        instanceId: z.string(),
        token: z.string(),
        whatsappAtivo: z.boolean(),
        modoTreinoAtivo: z.boolean(),
        contextoIA: z.string(),
        dadosIA: z.string(),
        servicos: z.array(z.object({
          nome: z.string(),
          preco: z.number(),
        })),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          nome: input.nome,
          telefone: input.telefone,
          endereco: input.endereco,
          dias: input.dias,
          horaInicio: input.horaInicio,
          horaFim: input.horaFim,
          instanceId: input.instanceId,
          token: input.token,
          whatsappAtivo: input.whatsappAtivo,
          modoTreinoAtivo: input.modoTreinoAtivo,
          contextoIA: input.contextoIA,
          dadosIA: input.dadosIA,
          servicos: input.servicos,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id));

      return { ok: true };
    }),

  // Obtém apenas os serviços
  getServicos: publicProcedure.query(async () => {
    const resultado = await db.query.configuracoes.findFirst();
    if (!resultado) return [];
    return resultado.servicos ?? [];
  }),
});
