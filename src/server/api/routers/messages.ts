import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { neon } from "@neondatabase/serverless"
import { env } from "@/env"

// Criar conexão SQL direta para este router
const sql = neon(env.DATABASE_URL)

export const messagesRouter = createTRPCRouter({
  listarPorConversa: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limite: z.number().default(100),
      }),
    )
    .query(async ({ input }) => {
      console.log(`🔍 [MESSAGES] Listando mensagens da conversa: ${input.conversationId}`)

      try {
        const result = await sql`
          SELECT 
            id,
            conversation_id as "conversationId",
            conteudo,
            remetente,
            tipo,
            created_at as "createdAt",
            metadata
          FROM messages
          WHERE conversation_id = ${input.conversationId}
          ORDER BY created_at ASC
          LIMIT ${input.limite}
        `

        // Processar mensagens garantindo que tudo seja string
        const mensagensFormatadas = result.map((msg: any) => ({
          id: String(msg.id),
          conversationId: String(msg.conversationId),
          conteudo: String(msg.conteudo || ""),
          tipo: msg.remetente === "cliente" ? "recebida" : msg.remetente === "bot" ? "enviada" : "sistema",
          // GARANTIR que timestamp seja string ISO
          timestamp: new Date(msg.createdAt).toISOString(),
          lida: true, // Por enquanto, marcar todas como lidas
          metadata: msg.metadata || {},
        }))

        console.log(`✅ [MESSAGES] Encontradas ${mensagensFormatadas.length} mensagens`)
        return mensagensFormatadas
      } catch (error) {
        console.error("💥 [MESSAGES] Erro ao listar mensagens:", error)
        throw new Error(`Erro ao carregar mensagens: ${error.message}`)
      }
    }),

  enviar: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        conteudo: z.string(),
        tipo: z.enum(["recebida", "enviada", "sistema"]),
      }),
    )
    .mutation(async ({ input }) => {
      console.log(`📤 [MESSAGES] Enviando mensagem:`, {
        conversationId: input.conversationId,
        tipo: input.tipo,
        tamanho: input.conteudo.length,
      })

      try {
        // Sempre enviar como bot quando a mensagem é enviada pelo sistema
        const remetente = input.tipo === "recebida" ? "cliente" : "bot"

        // Inserir mensagem
        const insertResult = await sql`
          INSERT INTO messages (conversation_id, conteudo, remetente, tipo)
          VALUES (${input.conversationId}, ${input.conteudo}, ${remetente}, 'texto')
          RETURNING id, created_at
        `

        const novaMensagem = insertResult[0]

        // Atualizar última mensagem da conversa
        await sql`
          UPDATE conversations 
          SET ultima_mensagem = ${input.conteudo.substring(0, 100)}, updated_at = NOW()
          WHERE id = ${input.conversationId}
        `

        console.log(`✅ [MESSAGES] Mensagem enviada:`, novaMensagem.id)
        return {
          id: String(novaMensagem.id),
          conversationId: input.conversationId,
          conteudo: input.conteudo,
          remetente,
          tipo: "texto",
          createdAt: new Date(novaMensagem.created_at).toISOString(),
        }
      } catch (error) {
        console.error("💥 [MESSAGES] Erro ao enviar mensagem:", error)
        throw new Error(`Erro ao enviar mensagem: ${error.message}`)
      }
    }),

  marcarComoLida: publicProcedure
    .input(
      z.object({
        messageId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log(`👁️ [MESSAGES] Marcando mensagem como lida: ${input.messageId}`)

      try {
        // Por enquanto, apenas log - implementar campo 'lida' no schema se necessário
        console.log(`✅ [MESSAGES] Mensagem marcada como lida`)
        return { success: true }
      } catch (error) {
        console.error("💥 [MESSAGES] Erro ao marcar como lida:", error)
        throw new Error("Erro ao marcar mensagem como lida")
      }
    }),

  buscarRecentes: publicProcedure
    .input(
      z.object({
        limite: z.number().default(50),
      }),
    )
    .query(async ({ input }) => {
      console.log(`🔍 [MESSAGES] Buscando mensagens recentes`)

      try {
        const result = await sql`
          SELECT 
            id,
            conversation_id as "conversationId",
            conteudo,
            remetente,
            created_at as "createdAt"
          FROM messages
          ORDER BY created_at DESC
          LIMIT ${input.limite}
        `

        // Processar mensagens garantindo que tudo seja string
        const mensagensFormatadas = result.map((msg: any) => ({
          id: String(msg.id),
          conversationId: String(msg.conversationId),
          conteudo: String(msg.conteudo),
          remetente: String(msg.remetente),
          createdAt: new Date(msg.createdAt).toISOString(),
        }))

        console.log(`✅ [MESSAGES] Encontradas ${mensagensFormatadas.length} mensagens recentes`)
        return mensagensFormatadas
      } catch (error) {
        console.error("💥 [MESSAGES] Erro ao buscar mensagens recentes:", error)
        throw new Error("Erro ao buscar mensagens recentes")
      }
    }),
})
