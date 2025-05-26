import { createTRPCRouter } from "../api/trpc";
import { agendamentoRouter } from "./routers/agendamento";
import { clienteRouter } from "./routers/cliente";
import { configuracaoRouter } from "./routers/configuracao";
import { dashboardRouter } from "./routers/dashboard";
import { linktreeRouter } from "./routers/linktree";

export const appRouter = createTRPCRouter({
  agendamento: agendamentoRouter,
  cliente: clienteRouter,
  configuracao: configuracaoRouter,
  linktree: linktreeRouter,
  dashboard: dashboardRouter,
});


export type AppRouter = typeof appRouter;
