import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { links } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const linktreeRouter = createTRPCRouter({
  listar: publicProcedure.query(() => db.query.links.findMany()),

  criar: publicProcedure
    .input(z.object({
      titulo: z.string(),
      url: z.string().url(),
      descricao: z.string().optional(),
      clienteId: z.string().uuid().optional(),
    }))
    .mutation(({ input }) => db.insert(links).values(input)),

  editar: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      titulo: z.string(),
      url: z.string().url(),
      descricao: z.string().optional(),
    }))
    .mutation(({ input }) =>
      db.update(links)
        .set(input)
        .where(eq(links.id, input.id))
    ),

  deletar: publicProcedure
    .input(z.string().uuid())
    .mutation(({ input }) => db.delete(links).where(eq(links.id, input))),
});
