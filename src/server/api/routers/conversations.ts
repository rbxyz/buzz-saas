import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { conversations, clientes, messages } from "@/server/db/schema";
import { eq, and, or, desc, sql, ilike, type SQL } from "drizzle-orm";

export const conversationsRouter = createTRPCRouter({
  listar: protectedProcedure
    .input(
      z.object({
        status: z.enum(["ativa", "pausada", "encerrada"]).optional(),
        busca: z.string().optional(),
        limite: z.number().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { status, busca, limite } = input;
      const userId = Number.parseInt(ctx.user.id);

      const conditions: (SQL | undefined)[] = [eq(conversations.userId, userId)];
      if (status) {
        conditions.push(eq(conversations.ativa, status === "ativa"));
      }
      if (busca) {
        const buscaLike = `%${busca.toLowerCase()}%`;
        conditions.push(
          or(
            ilike(conversations.telefone, buscaLike),
            ilike(sql`coalesce(${clientes.nome}, '')`, buscaLike)
          )
        );
      }

      const result = await ctx.db
        .select({
          id: conversations.id,
          telefone: conversations.telefone,
          status: sql<"ativa" | "pausada" | "encerrada">`
            CASE WHEN ${conversations.ativa} THEN 'ativa' ELSE 'pausada' END
          `,
          nomeCliente: clientes.nome,
          ultimaMensagem: conversations.ultimaMensagem,
          ultimaInteracao: conversations.ultimaInteracao,
          totalMensagens: sql<number>`(SELECT COUNT(*) FROM ${messages} WHERE ${messages.conversationId} = ${conversations.id})`.mapWith(Number),
          mensagensNaoLidas: sql<number>`(SELECT COUNT(*) FROM ${messages} WHERE ${messages.conversationId} = ${conversations.id} AND ${messages.role} = 'user')`.mapWith(Number),
        })
        .from(conversations)
        .leftJoin(clientes, eq(conversations.clienteId, clientes.id))
        .where(and(...conditions))
        .orderBy(desc(conversations.ultimaInteracao))
        .limit(limite);

      return result.map((conversa) => ({
        id: conversa.id.toString(),
        telefone: conversa.telefone,
        nomeCliente: conversa.nomeCliente ?? null,
        status: conversa.status,
        ultimaMensagem: conversa.ultimaMensagem ?? "Sem mensagens",
        ultimaInteracao: conversa.ultimaInteracao.toISOString(),
        totalMensagens: conversa.totalMensagens ?? 0,
        mensagensNaoLidas: conversa.mensagensNaoLidas ?? 0,
        tags: [],
      }));
    }),

  buscarPorTelefone: protectedProcedure
    .input(
      z.object({
        telefone: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const telefoneClean = input.telefone.replace(/\D/g, "");
      const userId = Number.parseInt(ctx.user.id);

      const conversa = await ctx.db.query.conversations.findFirst({
        where: and(eq(conversations.telefone, telefoneClean), eq(conversations.userId, userId)),
        with: {
          cliente: {
            columns: {
              nome: true,
            },
          },
        },
      });

      if (conversa) {
        return {
          id: conversa.id.toString(),
          telefone: conversa.telefone,
          status: conversa.ativa ? "ativa" : "pausada",
          clienteId: conversa.clienteId?.toString() ?? null,
          nomeCliente: conversa.cliente?.nome ?? null,
          createdAt: conversa.createdAt?.toISOString() ?? "",
          updatedAt: conversa.updatedAt?.toISOString() ?? "",
        };
      }

      return null;
    }),

  criar: protectedProcedure
    .input(
      z.object({
        telefone: z.string(),
        clienteId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { telefone, clienteId } = input;
      const userId = Number.parseInt(ctx.user.id);
      const telefoneClean = telefone.replace(/\D/g, "");

      const existingConversation = await ctx.db.query.conversations.findFirst({
        where: and(eq(conversations.telefone, telefoneClean), eq(conversations.userId, userId)),
      });

      if (existingConversation) {
        return existingConversation;
      }

      const [newConversation] = await ctx.db
        .insert(conversations)
        .values({
          telefone: telefoneClean,
          clienteId: clienteId ? Number.parseInt(clienteId) : null,
          userId,
          ativa: true,
          ultimaInteracao: new Date(),
        })
        .returning();

      return newConversation;
    }),

  atualizarStatus: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        status: z.enum(["ativa", "pausada", "encerrada"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(conversations)
        .set({
          ativa: input.status === "ativa",
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, Number.parseInt(input.conversationId)))
        .returning();

      if (!updated) {
        throw new Error("Conversa não encontrada");
      }
      return updated;
    }),

  atualizarUltimaMensagem: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        ultimaMensagem: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(conversations)
        .set({
          ultimaMensagem: input.ultimaMensagem,
          updatedAt: new Date(),
          ultimaInteracao: new Date(),
        })
        .where(eq(conversations.id, Number.parseInt(input.conversationId)));

      return { success: true };
    }),
});