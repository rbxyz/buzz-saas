import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { agendamentos, clientes } from "@/server/db/schema"
import { eq, and, gte, lte, desc, sql } from "drizzle-orm"
import dayjs from "dayjs"

// Cache em memória simples para dados que não mudam frequentemente
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key)
  if (!cached) return null

  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(key)
    return null
  }

  return cached.data as T
}

function setCachedData<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  })
}

export const agendamentoOptimizedRouter = createTRPCRouter({
  // Versão otimizada com paginação
  getAgendamentosPaginados: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.enum(["agendado", "cancelado", "concluido"]).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit

      // Construir filtros dinamicamente
      const filters = []

      if (input.status) {
        filters.push(eq(agendamentos.status, input.status))
      }

      if (input.dataInicio && input.dataFim) {
        const start = dayjs(input.dataInicio).startOf("day").toDate()
        const end = dayjs(input.dataFim).endOf("day").toDate()
        filters.push(and(gte(agendamentos.dataHora, start), lte(agendamentos.dataHora, end)))
      }

      // Query otimizada com apenas campos necessários
      const [agendamentosData, totalCount] = await Promise.all([
        db
          .select({
            id: agendamentos.id,
            dataHora: agendamentos.dataHora,
            servico: agendamentos.servico,
            status: agendamentos.status,
            valorCobrado: agendamentos.valorCobrado,
            clienteNome: clientes.nome,
            clienteId: clientes.id,
          })
          .from(agendamentos)
          .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
          .where(filters.length > 0 ? and(...filters) : undefined)
          .orderBy(desc(agendamentos.dataHora))
          .limit(input.limit)
          .offset(offset),

        // Count total para paginação
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(agendamentos)
          .where(filters.length > 0 ? and(...filters) : undefined)
          .then((result) => Number(result[0]?.count ?? 0)),
      ])

      const totalPages = Math.ceil(totalCount / input.limit)
      const hasNextPage = input.page < totalPages
      const hasPreviousPage = input.page > 1

      return {
        data: agendamentosData,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      }
    }),

  // Busca otimizada de clientes com cache
  searchClientesOptimized: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ input }) => {
      const cacheKey = `clientes-search-${input.query}-${input.limit}`

      // Verificar cache primeiro
      const cached = getCachedData<any[]>(cacheKey)
      if (cached) {
        return cached
      }

      const searchTerm = `%${input.query.toLowerCase()}%`

      const clientesEncontrados = await db
        .select({
          id: clientes.id,
          nome: clientes.nome,
          telefone: clientes.telefone,
        })
        .from(clientes)
        .where(sql`LOWER(${clientes.nome}) LIKE ${searchTerm}`)
        .limit(input.limit)

      // Cache por 2 minutos
      setCachedData(cacheKey, clientesEncontrados, 2 * 60 * 1000)

      return clientesEncontrados
    }),

  // Stats do dashboard com cache agressivo
  getDashboardStatsOptimized: publicProcedure.query(async () => {
    const cacheKey = "dashboard-stats"

    // Cache por 30 segundos para stats em tempo real
    const cached = getCachedData<any>(cacheKey)
    if (cached) {
      return cached
    }

    const hoje = dayjs().startOf("day").toDate()
    const ontem = dayjs().subtract(1, "day").startOf("day").toDate()
    const seteDiasAtras = dayjs().subtract(7, "day").startOf("day").toDate()

    // Executar queries em paralelo para melhor performance
    const [agendamentosHoje, agendamentosOntem, totalClientes, faturamentoSemana, agendamentosPorStatus] =
      await Promise.all([
        // Agendamentos hoje
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(agendamentos)
          .where(and(gte(agendamentos.dataHora, hoje), eq(agendamentos.status, "agendado")))
          .then((result) => Number(result[0]?.count ?? 0)),

        // Agendamentos ontem
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(agendamentos)
          .where(
            and(
              gte(agendamentos.dataHora, ontem),
              lte(agendamentos.dataHora, hoje),
              eq(agendamentos.status, "agendado"),
            ),
          )
          .then((result) => Number(result[0]?.count ?? 0)),

        // Total de clientes
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(clientes)
          .then((result) => Number(result[0]?.count ?? 0)),

        // Faturamento última semana
        db
          .select({ total: sql<number>`SUM(${agendamentos.valorCobrado})` })
          .from(agendamentos)
          .where(and(gte(agendamentos.dataHora, seteDiasAtras), eq(agendamentos.status, "concluido")))
          .then((result) => Number(result[0]?.total ?? 0)),

        // Agendamentos por status
        db
          .select({
            status: agendamentos.status,
            count: sql<number>`COUNT(*)`,
          })
          .from(agendamentos)
          .groupBy(agendamentos.status)
          .then((results) =>
            results.reduce(
              (acc, { status, count }) => {
                acc[status] = Number(count)
                return acc
              },
              {} as Record<string, number>,
            ),
          ),
      ])

    const stats = {
      agendamentosHoje,
      agendamentosOntem,
      totalClientes,
      faturamentoSemana,
      agendamentosPorStatus,
      variacaoAgendamentos:
        agendamentosOntem > 0 ? ((agendamentosHoje - agendamentosOntem) / agendamentosOntem) * 100 : 0,
    }

    // Cache por 30 segundos
    setCachedData(cacheKey, stats, 30 * 1000)

    return stats
  }),
})
