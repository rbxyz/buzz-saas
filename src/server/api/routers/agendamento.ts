import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { agendamentos, clientes, configuracoes } from "@/server/db/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import dayjs from "dayjs";
import { sql, asc, desc } from "drizzle-orm"; // Importando asc e desc

type ServicoConfigurado = {
  nome: string;
  preco: number;
};


export const agendamentoRouter = createTRPCRouter({
  getByData: publicProcedure
    .input(z.object({ date: z.string() })) // ISO string
    .query(async ({ input }) => {
      const start = dayjs(input.date).startOf("day").toDate();
      const end = dayjs(input.date).endOf("day").toDate();

      const agendamentosDoDia = await db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
          cliente: {
            nome: clientes.nome,
          },
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .where(
          and(
            gte(agendamentos.dataHora, start),
            lte(agendamentos.dataHora, end)
          )
        );

      return agendamentosDoDia;
    }),

  create: publicProcedure
    .input(
      z.object({
        clienteId: z.string().uuid(),
        data: z.string(), // Ex: "2025-05-21"
        horario: z.string(), // Ex: "14:30"
        servico: z.string(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
      })
    )
    .mutation(async ({ input }) => {
      const dataHora = dayjs(`${input.data}T${input.horario}`).toDate();
      // 🔍 Buscar o valor do serviço na configuração
      const configuracao = await db.query.configuracoes.findFirst();

      if (!configuracao) throw new Error("Configuração não encontrada");
      
      const servicos = configuracao.servicos as ServicoConfigurado[];
      const servicoSelecionado = servicos.find(
        (s) => s.nome.toLowerCase() === input.servico.toLowerCase()
      );
      
      if (!servicoSelecionado) {
        throw new Error(`Serviço "${input.servico}" não encontrado na configuração`);
      }

      const valorCobrado = servicoSelecionado.preco;

      const result = await db.insert(agendamentos).values({
        clienteId: input.clienteId,
        dataHora,
        servico: input.servico,
        status: input.status,
        valorCobrado,
      }).returning({
        id: agendamentos.id,
      });

      return result[0];
    }),

  atualizarStatus: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(agendamentos)
        .set({ status: input.status })
        .where(eq(agendamentos.id, input.id))
        .returning();

      return result[0];
    }),

    getByClientCode: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const searchTerm = `%${input.query.toLowerCase()}%`;
  
      const clientesEncontrados = await db
        .select({
          id: clientes.id,
          nome: clientes.nome,
        })
        .from(clientes)
        .where(
          sql`LOWER(${clientes.nome}) LIKE ${searchTerm}`
        )
        .limit(10);
  
      return clientesEncontrados;
    }),
    
  getCortesDoMes: publicProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

      const cortes = await db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
          cliente: {
            nome: clientes.nome,
          },
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .where(and(
          gte(agendamentos.dataHora, startDate),
          lte(agendamentos.dataHora, endDate),
          sql`${agendamentos.servico} ILIKE '%corte%'`
        ))
        .orderBy(desc(agendamentos.dataHora)); // Ordena do mais recente para o mais antigo

      return cortes;
    }),
    
    getHistoricoPorCliente: publicProcedure
    .input(z.object({ clienteId: z.string().uuid() }))
    .query(async ({ input }) => {
      const historico = await db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
        })
        .from(agendamentos)
        .where(eq(agendamentos.clienteId, input.clienteId))
        .orderBy(desc(agendamentos.dataHora));

      return historico;
    }),

    getFaturamentoPorCliente: publicProcedure.query(async () => {
      const resultado = await db
        .select({
          clienteId: agendamentos.clienteId,
          nome: clientes.nome,
          quantidade: sql<number>`COUNT(*)`,
          total: sql<number>`SUM(${agendamentos.valorCobrado})`,
        })
        .from(agendamentos)
        .innerJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .where(eq(agendamentos.status, "concluido"))
        .groupBy(agendamentos.clienteId, clientes.nome)
        .orderBy(desc(sql<number>`SUM(${agendamentos.valorCobrado})`));
    
      return resultado;
    }),
});
