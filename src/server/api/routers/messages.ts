import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { z } from "zod"
import { messages, conversations } from "@/server/db/schema"
import { eq } from "drizzle-orm"

const MessageSchema = z.object({
  conversationId: z.string().uuid(),
  remetente: z.enum(["cliente", "bot", "atendente"]),
  conteudo: z.string().max(10000),
  tipo: z.enum(["texto", "imagem", "audio", "documento"]).optional(),
  metadata: z.any().optional(),
})

export const messagesRouter = createTRPCRouter({
  create: protectedProcedure.input(MessageSchema).mutation(async ({ ctx, input }) => {
    const message = await ctx.db
      .insert(messages)
      .values(input)
      .returning()
      .then((rows) => rows[0])

    // Update the conversation's ultimaMensagem timestamp
    await ctx.db
      .update(conversations)
      .set({
        ultimaMensagem: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, input.conversationId))

    return message
  }),

  getByConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const conversationMessages = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt)
      return conversationMessages
    }),

  getRecent: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        limit: z.number().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const recentMessages = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt)
        .limit(input.limit)
      return recentMessages
    }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(messages).where(eq(messages.id, input.id))
    return { success: true }
  }),
})
