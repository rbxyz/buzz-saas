import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { configuracoes } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const configuracaoRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.string()) // chave
    .query(({ input }) =>
      db.query.configuracoes.findFirst({ where: eq(configuracoes.chave, input) })
    ),

  salvar: publicProcedure
    .input(z.object({
      chave: z.string(),
      valor: z.string(),
    }))
    .mutation(async ({ input }) => {
      const existe = await db.query.configuracoes.findFirst({
        where: eq(configuracoes.chave, input.chave),
      });

      if (existe) {
        return db.update(configuracoes)
          .set({ valor: input.valor })
          .where(eq(configuracoes.chave, input.chave));
      }

      return db.insert(configuracoes).values(input);
    }),
});
