import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { configuracoes } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";

export const configuracaoRouter = createTRPCRouter({
  // Recupera todas as configurações cadastradas (sem filtro)
  listar: publicProcedure.query(async () => {
    const resultados = await db.query.configuracoes.findMany();
    return resultados; // retorna array [{chave, valor}, ...]
  }),

  // Salvar uma única configuração (pode ser usado internamente)
  salvarUnica: publicProcedure
    .input(
      z.object({
        chave: z.string(),
        valor: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const existe = await db.query.configuracoes.findFirst({
        where: eq(configuracoes.chave, input.chave),
      });

      if (existe) {
        return db
          .update(configuracoes)
          .set({ valor: input.valor })
          .where(eq(configuracoes.chave, input.chave));
      }

      return db.insert(configuracoes).values(input);
    }),

  // Salvar várias configurações de uma vez (chamado "salvar" no frontend)
  salvar: publicProcedure
    .input(
      z.array(
        z.object({
          chave: z.string(),
          valor: z.string(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const chaves = input.map((item) => item.chave);
      const existentes = await db.query.configuracoes.findMany({
        where: inArray(configuracoes.chave, chaves),
      });

      const existentesSet = new Set(existentes.map((item) => item.chave));

      const updates = input.filter((item) => existentesSet.has(item.chave));
      const inserts = input.filter((item) => !existentesSet.has(item.chave));

      if (updates.length > 0) {
        await Promise.all(
          updates.map((item) =>
            db
              .update(configuracoes)
              .set({ valor: item.valor })
              .where(eq(configuracoes.chave, item.chave))
          )
        );
      }

      if (inserts.length > 0) {
        await db.insert(configuracoes).values(inserts);
      }

      return { ok: true };
    }),
});
