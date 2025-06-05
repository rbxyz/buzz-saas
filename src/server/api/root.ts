import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"
import { configuracaoRouter } from "./routers/configuracao"
import { agendamentoRouter } from "./routers/agendamento"
import { clienteRouter } from "./routers/cliente"
import { dashboardRouter } from "./routers/dashboard"
import { linktreeRouter } from "./routers/linktree"
import { agendamentoOptimizedRouter } from "./routers/agendamento-optimized"
import { intervalosTrabalhoRouter } from "./routers/intervalo-trabalho"
import { authRouter } from "./routers/auth"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  configuracao: configuracaoRouter,
  agendamento: agendamentoRouter,
  agendamentoOptimized: agendamentoOptimizedRouter,
  intervalosTrabalho: intervalosTrabalhoRouter,
  cliente: clienteRouter,
  dashboard: dashboardRouter,
  linktree: linktreeRouter,
  auth: authRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
