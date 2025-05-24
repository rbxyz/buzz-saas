import { createTRPCRouter } from "../api/trpc";
import { agendamentoRouter } from "./routers/agendamento";
import { clienteRouter } from "./routers/cliente";
import { configuracaoRouter } from "./routers/configuracao";
import { dashboardRouter } from "./routers/dashboard";
import { linktreeRouter } from "./routers/linktree";
import { relatorioRouter } from "./routers/relatorio";

export const appRouter = createTRPCRouter({
  agendamento: agendamentoRouter,
  cliente: clienteRouter,
  configuracao: configuracaoRouter,
  linktree: linktreeRouter,
  relatorio: relatorioRouter,
  dashboard: dashboardRouter,
});


export type AppRouter = typeof appRouter;
