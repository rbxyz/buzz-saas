import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { neon } from "@neondatabase/serverless"
import { env } from "@/env"

// Criar conexão SQL direta para este router
const sql = neon(env.DATABASE_URL)

export const conversationsRouter = createTRPCRouter({
  listar: publicProcedure
    .input(
      z.object({
        status: z.enum(["ativa", "pausada", "encerrada"]).optional(),
        busca: z.string().optional(),
        limite: z.number().default(50),
      }),
    )
    .query(async ({ input }) => {
      console.log(`🔍 [CONVERSATIONS] === INÍCIO DEBUG ===`)
      console.log(`🔍 [CONVERSATIONS] Input recebido:`, JSON.stringify(input, null, 2))

      try {
        // Testar conexão primeiro
        console.log(`🔍 [CONVERSATIONS] Testando conexão direta...`)
        const testResult = await sql`SELECT NOW() as current_time, current_database() as db_name`
        console.log(`🔍 [CONVERSATIONS] Conexão OK:`, testResult[0])

        // Verificar se há conversas no banco
        console.log(`🔍 [CONVERSATIONS] Contando conversas...`)
        const countResult = await sql`SELECT COUNT(*) as total FROM conversations`
        const totalConversas = Number(countResult[0]?.total || 0)
        console.log(`📊 [CONVERSATIONS] Total de conversas no banco:`, totalConversas)

        if (totalConversas === 0) {
          console.log(`❌ [CONVERSATIONS] Nenhuma conversa encontrada no banco!`)
          return []
        }

        // Query principal usando template literals do Neon (sem a coluna "lida" que não existe)
        console.log(`🔍 [CONVERSATIONS] Executando query principal...`)

        let result: any[]

        if (input.status && input.busca) {
          // Com status e busca
          result = await sql`
            SELECT 
              c.id,
              c.telefone,
              c.status,
              c.created_at,
              c.updated_at,
              c.cliente_id,
              cl.nome as nome_cliente,
              c.ultima_mensagem as ultima_mensagem_real,
              COALESCE(
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id),
                0
              ) as total_mensagens,
              COALESCE(
                (SELECT COUNT(*) 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 AND remetente = 'cliente'),
                0
              ) as mensagens_nao_lidas,
              COALESCE(
                (SELECT created_at 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC 
                 LIMIT 1),
                c.updated_at
              ) as ultima_interacao
            FROM conversations c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            WHERE c.status = ${input.status}::conversation_status
            AND (c.telefone ILIKE ${`%${input.busca}%`} OR COALESCE(cl.nome, '') ILIKE ${`%${input.busca.toLowerCase()}%`})
            ORDER BY c.updated_at DESC
            LIMIT ${input.limite}
          `
        } else if (input.status) {
          // Só com status
          result = await sql`
            SELECT 
              c.id,
              c.telefone,
              c.status,
              c.created_at,
              c.updated_at,
              c.cliente_id,
              cl.nome as nome_cliente,
              c.ultima_mensagem as ultima_mensagem_real,
              COALESCE(
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id),
                0
              ) as total_mensagens,
              COALESCE(
                (SELECT COUNT(*) 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 AND remetente = 'cliente'),
                0
              ) as mensagens_nao_lidas,
              COALESCE(
                (SELECT created_at 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC 
                 LIMIT 1),
                c.updated_at
              ) as ultima_interacao
            FROM conversations c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            WHERE c.status = ${input.status}::conversation_status
            ORDER BY c.updated_at DESC
            LIMIT ${input.limite}
          `
        } else if (input.busca) {
          // Só com busca
          result = await sql`
            SELECT 
              c.id,
              c.telefone,
              c.status,
              c.created_at,
              c.updated_at,
              c.cliente_id,
              cl.nome as nome_cliente,
              c.ultima_mensagem as ultima_mensagem_real,
              COALESCE(
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id),
                0
              ) as total_mensagens,
              COALESCE(
                (SELECT COUNT(*) 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 AND remetente = 'cliente'),
                0
              ) as mensagens_nao_lidas,
              COALESCE(
                (SELECT created_at 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC 
                 LIMIT 1),
                c.updated_at
              ) as ultima_interacao
            FROM conversations c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            WHERE (c.telefone ILIKE ${`%${input.busca}%`} OR COALESCE(cl.nome, '') ILIKE ${`%${input.busca.toLowerCase()}%`})
            ORDER BY c.updated_at DESC
            LIMIT ${input.limite}
          `
        } else {
          // Sem filtros
          result = await sql`
            SELECT 
              c.id,
              c.telefone,
              c.status,
              c.created_at,
              c.updated_at,
              c.cliente_id,
              cl.nome as nome_cliente,
              c.ultima_mensagem as ultima_mensagem_real,
              COALESCE(
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id),
                0
              ) as total_mensagens,
              COALESCE(
                (SELECT COUNT(*) 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 AND remetente = 'cliente'),
                0
              ) as mensagens_nao_lidas,
              COALESCE(
                (SELECT created_at 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC 
                 LIMIT 1),
                c.updated_at
              ) as ultima_interacao
            FROM conversations c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            ORDER BY c.updated_at DESC
            LIMIT ${input.limite}
          `
        }

        console.log(`🔍 [CONVERSATIONS] Resultado bruto:`, {
          hasResult: !!result,
          isArray: Array.isArray(result),
          length: result?.length || 0,
          firstRow: result?.[0] || null,
        })

        if (!result || !Array.isArray(result) || result.length === 0) {
          console.log(`❌ [CONVERSATIONS] Query retornou resultado vazio!`)
          return []
        }

        console.log(`✅ [CONVERSATIONS] Encontradas ${result.length} conversas`)
        console.log(`🔍 [CONVERSATIONS] Primeira conversa (bruta):`, JSON.stringify(result[0], null, 2))

        // Processar conversas
        console.log(`🔍 [CONVERSATIONS] Processando conversas...`)
        const conversasProcessadas = result.map((conversa: any, index: number) => {
          console.log(`🔍 [CONVERSATIONS] Processando conversa ${index + 1}:`, {
            id: conversa.id,
            telefone: conversa.telefone,
            status: conversa.status,
            nome_cliente: conversa.nome_cliente,
          })

          return {
            id: String(conversa.id),
            telefone: String(conversa.telefone || ""),
            nomeCliente: conversa.nome_cliente ? String(conversa.nome_cliente) : null,
            status: String(conversa.status || "ativa"),
            ultimaMensagem: String(conversa.ultima_mensagem_real || "Sem mensagens"),
            ultimaInteracao: conversa.ultima_interacao
              ? new Date(conversa.ultima_interacao).toISOString()
              : new Date().toISOString(),
            totalMensagens: Number(conversa.total_mensagens || 0),
            mensagensNaoLidas: Number(conversa.mensagens_nao_lidas || 0),
            tags: [],
          }
        })

        console.log(`📊 [CONVERSATIONS] Conversas processadas:`, conversasProcessadas.length)
        console.log(
          `🔍 [CONVERSATIONS] Primeira conversa processada:`,
          JSON.stringify(conversasProcessadas[0], null, 2),
        )
        console.log(`🔍 [CONVERSATIONS] === FIM DEBUG ===`)

        return conversasProcessadas
      } catch (error) {
        console.error("💥 [CONVERSATIONS] Erro detalhado:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          error: error,
        })
        return []
      }
    }),

  buscarPorTelefone: publicProcedure
    .input(
      z.object({
        telefone: z.string(),
      }),
    )
    .query(async ({ input }) => {
      console.log(`🔍 [CONVERSATIONS] Buscando conversa por telefone: ${input.telefone}`)

      try {
        const telefoneClean = input.telefone.replace(/\D/g, "")

        const result = await sql`
          SELECT 
            c.id,
            c.telefone,
            c.status,
            c.cliente_id,
            c.created_at,
            c.updated_at,
            cl.nome as nome_cliente
          FROM conversations c
          LEFT JOIN clientes cl ON c.cliente_id = cl.id
          WHERE c.telefone = ${telefoneClean}
          LIMIT 1
        `

        const conversa = result[0]

        if (conversa) {
          return {
            id: String(conversa.id),
            telefone: String(conversa.telefone),
            status: String(conversa.status),
            clienteId: conversa.cliente_id ? String(conversa.cliente_id) : null,
            nomeCliente: conversa.nome_cliente ? String(conversa.nome_cliente) : null,
            createdAt: new Date(conversa.created_at).toISOString(),
            updatedAt: new Date(conversa.updated_at).toISOString(),
          }
        }

        return null
      } catch (error) {
        console.error("💥 [CONVERSATIONS] Erro ao buscar conversa:", error)
        return null
      }
    }),

  criar: publicProcedure
    .input(
      z.object({
        telefone: z.string(),
        clienteId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log(`🆕 [CONVERSATIONS] Criando nova conversa:`, input)

      try {
        const telefoneClean = input.telefone.replace(/\D/g, "")

        // Verificar se já existe
        const existeResult = await sql`
          SELECT id, created_at, updated_at 
          FROM conversations 
          WHERE telefone = ${telefoneClean}
          LIMIT 1
        `

        if (existeResult.length > 0) {
          const conversa = existeResult[0]
          console.log(`ℹ️ [CONVERSATIONS] Conversa já existe:`, conversa.id)
          return {
            id: String(conversa.id),
            telefone: telefoneClean,
            status: "ativa",
            clienteId: input.clienteId || null,
            createdAt: new Date(conversa.created_at).toISOString(),
            updatedAt: new Date(conversa.updated_at).toISOString(),
          }
        }

        // Criar nova
        const criarResult = await sql`
          INSERT INTO conversations (telefone, cliente_id, status)
          VALUES (${telefoneClean}, ${input.clienteId || null}, 'ativa')
          RETURNING id, created_at, updated_at
        `

        const novaConversa = criarResult[0]

        if (!novaConversa) {
          throw new Error("Falha ao criar conversa")
        }

        console.log(`✅ [CONVERSATIONS] Nova conversa criada:`, novaConversa.id)
        return {
          id: String(novaConversa.id),
          telefone: telefoneClean,
          status: "ativa",
          clienteId: input.clienteId || null,
          createdAt: new Date(novaConversa.created_at).toISOString(),
          updatedAt: new Date(novaConversa.updated_at).toISOString(),
        }
      } catch (error) {
        console.error("💥 [CONVERSATIONS] Erro ao criar conversa:", error)
        throw new Error("Erro ao criar conversa")
      }
    }),

  atualizarStatus: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        status: z.enum(["ativa", "pausada", "encerrada"]),
      }),
    )
    .mutation(async ({ input }) => {
      console.log(`🔄 [CONVERSATIONS] Atualizando status da conversa:`, input)

      try {
        const result = await sql`
          UPDATE conversations 
          SET status = ${input.status}::conversation_status, updated_at = NOW()
          WHERE id = ${input.conversationId}
          RETURNING id, status, updated_at
        `

        const conversa = result[0]

        if (!conversa) {
          throw new Error("Conversa não encontrada")
        }

        console.log(`✅ [CONVERSATIONS] Status atualizado para:`, input.status)
        return {
          id: String(conversa.id),
          status: String(conversa.status),
          updatedAt: new Date(conversa.updated_at).toISOString(),
        }
      } catch (error) {
        console.error("💥 [CONVERSATIONS] Erro ao atualizar status:", error)
        throw new Error("Erro ao atualizar status da conversa")
      }
    }),

  atualizarUltimaMensagem: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        ultimaMensagem: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await sql`
          UPDATE conversations 
          SET ultima_mensagem = ${input.ultimaMensagem}, updated_at = NOW()
          WHERE id = ${input.conversationId}
        `

        console.log(`✅ [CONVERSATIONS] Última mensagem atualizada`)
        return { success: true }
      } catch (error) {
        console.error("💥 [CONVERSATIONS] Erro ao atualizar última mensagem:", error)
        throw new Error("Erro ao atualizar última mensagem")
      }
    }),
})
