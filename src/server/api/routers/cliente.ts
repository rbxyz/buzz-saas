import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { clientes } from "@/server/db/schema"
import { eq, sql, desc } from "drizzle-orm"

export const clienteRouter = createTRPCRouter({
  listar: publicProcedure.query(async () => {
    const clientesData = await db.select().from(clientes).orderBy(desc(clientes.createdAt))
    return clientesData
  }),

  criar: publicProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const novoCliente = await db
        .insert(clientes)
        .values({
          nome: input.nome,
          telefone: input.telefone,
          email: input.email,
        })
        .returning()

      return novoCliente[0]
    }),

  atualizar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(1, "Nome é obrigatório"),
        telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const clienteAtualizado = await db
        .update(clientes)
        .set({
          nome: input.nome,
          telefone: input.telefone,
          email: input.email,
          updatedAt: new Date(),
        })
        .where(eq(clientes.id, input.id))
        .returning()

      return clienteAtualizado[0]
    }),

  excluir: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    await db.delete(clientes).where(eq(clientes.id, input.id))
    return { success: true }
  }),

  buscarPorId: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const cliente = await db.select().from(clientes).where(eq(clientes.id, input.id)).limit(1)
    return cliente[0] || null
  }),

  buscarPorNome: publicProcedure.input(z.object({ nome: z.string() })).query(async ({ input }) => {
    const searchTerm = `%${input.nome.toLowerCase()}%`

    const clientesEncontrados = await db
      .select()
      .from(clientes)
      .where(sql`LOWER(${clientes.nome}) LIKE ${searchTerm}`)
      .orderBy(clientes.nome)
      .limit(10)

    return clientesEncontrados
  }),

  obterEstatisticas: publicProcedure.query(async () => {
    const totalClientes = await db.select({ count: sql<number>`COUNT(*)` }).from(clientes)

    const clientesRecentes = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clientes)
      .where(sql`${clientes.createdAt} >= NOW() - INTERVAL '30 days'`)

    return {
      total: totalClientes[0]?.count || 0,
      recentes: clientesRecentes[0]?.count || 0,
    }
  }),
    // PROCEDIMENTO CRÍTICO: buscarPorTelefone (buscarClientePorTelefone)
    buscarPorTelefone: publicProcedure.input(z.object({ telefone: z.string() })).query(async ({ input }) => {
      console.log("🔍 Iniciando busca de cliente por telefone no backend:", input.telefone)
  
      // Limpar telefone - remover formatação
      const telefoneNumeros = input.telefone.replace(/\D/g, "")
  
      console.log("📱 Telefone limpo para busca:", telefoneNumeros)
  
      if (!telefoneNumeros || telefoneNumeros.length < 10) {
        console.log("❌ Telefone inválido - menos de 10 dígitos:", telefoneNumeros)
        return null
      }
  
      try {
        // Buscar por telefone exato (apenas números)
        const cliente = await db.select().from(clientes).where(eq(clientes.telefone, telefoneNumeros)).limit(1)
  
        if (cliente[0]) {
          console.log("✅ Cliente encontrado no banco:", {
            id: cliente[0].id,
            nome: cliente[0].nome,
            telefone: cliente[0].telefone,
            email: cliente[0].email,
          })
          return cliente[0]
        } else {
          console.log("ℹ️ Nenhum cliente encontrado para telefone:", telefoneNumeros)
          return null
        }
      } catch (error) {
        console.error("❌ Erro na consulta do banco de dados:", error)
        throw error
      }
    }),
  
})
