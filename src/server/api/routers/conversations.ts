import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { z } from "zod"
import { conversations, messages } from "@/server/db/schema"
import { eq, desc } from "drizzle-orm"

const ConversationSchema = z.object({
  clienteId: z.string().uuid().optional(),
  telefone: z.string().min(1),
  status: z.enum(["ativa", "encerrada", "pausada"]).optional(),
  metadata: z.any().optional(),
})

export const conversationsRouter = createTRPCRouter({
  create: protectedProcedure.input(ConversationSchema).mutation(async ({ ctx, input }) => {
    const conversation = await ctx.db
      .insert(conversations)
      .values(input)
      .returning()
      .then((rows) => rows[0])
    return conversation
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const allConversations = await ctx.db.select().from(conversations).orderBy(desc(conversations.updatedAt))
    return allConversations
  }),

  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const conversation = await ctx.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, input.id))
      .then((rows) => rows[0] ?? null)
    return conversation
  }),

  getByTelefone: protectedProcedure.input(z.object({ telefone: z.string() })).query(async ({ ctx, input }) => {
    const conversation = await ctx.db
      .select()
      .from(conversations)
      .where(eq(conversations.telefone, input.telefone))
      .orderBy(desc(conversations.updatedAt))
      .then((rows) => rows[0] ?? null)
    return conversation
  }),

  getWithMessages: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const conversation = await ctx.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, input.id))
      .then((rows) => rows[0] || null)

    if (!conversation) return null

    const messagesList = await ctx.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, input.id))
      .orderBy(messages.createdAt)

    return {
      ...conversation,
      messages: messagesList,
    }
  }),

  update: protectedProcedure
    .input(ConversationSchema.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const updatedConversation = await ctx.db
        .update(conversations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, id))
        .returning()
        .then((rows) => rows[0])
      return updatedConversation
    }),

  updateUltimaMensagem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const updatedConversation = await ctx.db
        .update(conversations)
        .set({
          ultimaMensagem: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, input.id))
        .returning()
        .then((rows) => rows[0])
      return updatedConversation
    }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    // First delete all messages in the conversation
    await ctx.db.delete(messages).where(eq(messages.conversationId, input.id))

    // Then delete the conversation
    await ctx.db.delete(conversations).where(eq(conversations.id, input.id))

    return { success: true }
  }),
})
