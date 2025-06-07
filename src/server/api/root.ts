import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"
import { configuracaoRouter } from "./routers/configuracao"
import { agendamentoRouter } from "./routers/agendamento"
import { clienteRouter } from "./routers/cliente"
import { dashboardRouter } from "./routers/dashboard"
import { linktreeRouter } from "./routers/linktree"
import { agendamentoOptimizedRouter } from "./routers/agendamento-optimized"
import { intervalosTrabalhoRouter } from "./routers/intervalo-trabalho"
import { authRouter } from "./routers/auth"
import { conversationsRouter } from "./routers/conversations"
import { messagesRouter } from "./routers/messages"
import { agentsRouter } from "./routers/agents"

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
  conversations: conversationsRouter,
  messages: messagesRouter,
  agents: agentsRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
