import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { clientes } from "@/server/db/schema"
import { eq, sql, desc } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

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
        email: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Verificar se já existe um cliente com este telefone ANTES de tentar inserir
        const telefoneNumeros = input.telefone.replace(/\D/g, "")

        const clienteExistente = await db
          .select()
          .from(clientes)
          .where(
            sql`REPLACE(REPLACE(REPLACE(REPLACE(${clientes.telefone}, '(', ''), ')', ''), '-', ''), ' ', '') = ${telefoneNumeros}`,
          )
          .limit(1)

        if (clienteExistente.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "TELEFONE_DUPLICADO",
            cause: {
              clienteExistente: clienteExistente[0],
              telefone: input.telefone,
            },
          })
        }

        const novoCliente = await db
          .insert(clientes)
          .values({
            nome: input.nome,
            telefone: input.telefone,
            email: input.email ?? null,
          })
          .returning()

        return novoCliente[0]
      } catch (error) {

        // Se é um erro que já tratamos (TELEFONE_DUPLICADO), re-throw
        if (error instanceof TRPCError) {
          throw error
        }

        // Verificar se é um erro de chave duplicada do banco
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
        if (errorMessage.includes("unique constraint") && errorMessage.includes("telefone")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "TELEFONE_DUPLICADO",
            cause: {
              telefone: input.telefone,
            },
          })
        }

        // Outros erros
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao criar cliente: ${errorMessage}`,
        })
      }
    }),

  atualizar: publicProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(1, "Nome é obrigatório"),
        telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
        email: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Verificar se já existe outro cliente com este telefone (exceto o atual)
        const telefoneNumeros = input.telefone.replace(/\D/g, "")

        const clienteExistente = await db
          .select()
          .from(clientes)
          .where(
            sql`REPLACE(REPLACE(REPLACE(REPLACE(${clientes.telefone}, '(', ''), ')', ''), '-', ''), ' ', '') = ${telefoneNumeros} AND ${clientes.id} != ${input.id}`,
          )
          .limit(1)

        if (clienteExistente.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "TELEFONE_DUPLICADO",
            cause: {
              clienteExistente: clienteExistente[0],
              telefone: input.telefone,
            },
          })
        }

        const clienteAtualizado = await db
          .update(clientes)
          .set({
            nome: input.nome,
            telefone: input.telefone,
            email: input.email ?? null,
            updatedAt: new Date(),
          })
          .where(eq(clientes.id, input.id))
          .returning()

        return clienteAtualizado[0]
      } catch (error) {
        // Se é um erro que já tratamos (TELEFONE_DUPLICADO), re-throw
        if (error instanceof TRPCError) {
          throw error
        }

        // Verificar se é um erro de chave duplicada do banco
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
        if (errorMessage.includes("unique constraint") && errorMessage.includes("telefone")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "TELEFONE_DUPLICADO",
            cause: {
              telefone: input.telefone,
            },
          })
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao atualizar cliente: ${errorMessage}`,
        })
      }
    }),

  excluir: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    try {
      await db.delete(clientes).where(eq(clientes.id, input.id))
      return { success: true }
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      if (errorMessage.includes("foreign key") || errorMessage.includes("constraint")) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "CLIENTE_COM_AGENDAMENTOS",
          cause: {
            clienteId: input.id,
          },
        })
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao excluir cliente: ${errorMessage}`,
      })
    }
  }),

  buscarPorId: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    try {
      const cliente = await db.select().from(clientes).where(eq(clientes.id, input.id)).limit(1)
      return cliente[0] ?? null
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao buscar cliente",
      })
    }
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
      total: totalClientes[0]?.count ?? 0,
      recentes: clientesRecentes[0]?.count ?? 0,
    }
  }),

  buscarPorTelefone: publicProcedure.input(z.object({ telefone: z.string() })).query(async ({ input }) => {
    const telefoneNumeros = input.telefone.replace(/\D/g, "")

    if (!telefoneNumeros || telefoneNumeros.length < 10) {
      return null
    }

    try {
      const cliente = await db
        .select()
        .from(clientes)
        .where(
          sql`REPLACE(REPLACE(REPLACE(REPLACE(${clientes.telefone}, '(', ''), ')', ''), '-', ''), ' ', '') = ${telefoneNumeros}`,
        )
        .limit(1)

      if (cliente[0]) {
        return cliente[0]
      } else {
        return null
      }
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao buscar cliente por telefone",
      })
    }
  }),

  buscarPorNomeOuTelefone: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
    const searchQuery = input.query.trim().toLowerCase()

    if (!searchQuery || searchQuery.length < 2) {
      return []
    }

    try {
      // Verifica se a query contém apenas números (busca por telefone)
      const isPhoneSearch = /^\d+$/.test(searchQuery.replace(/\D/g, ""))

      if (isPhoneSearch) {
        // Busca por telefone
        const telefoneNumeros = searchQuery.replace(/\D/g, "")
        const clientesPorTelefone = await db
          .select()
          .from(clientes)
          .where(
            sql`REPLACE(REPLACE(REPLACE(REPLACE(${clientes.telefone}, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ${`%${telefoneNumeros}%`}`,
          )
          .orderBy(clientes.nome)
          .limit(10)

        return clientesPorTelefone
      } else {
        // Busca por nome
        const searchTerm = `%${searchQuery}%`
        const clientesPorNome = await db
          .select()
          .from(clientes)
          .where(sql`LOWER(${clientes.nome}) LIKE ${searchTerm}`)
          .orderBy(clientes.nome)
          .limit(10)

        return clientesPorNome
      }
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao buscar clientes",
      })
    }
  }),
})
