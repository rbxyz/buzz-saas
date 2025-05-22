import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { links } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const linktreeRouter = createTRPCRouter({
  listar: publicProcedure.query(async () => {
    const result = await db.query.links.findMany();

    // Garantir que imagem (ou outro campo binário) esteja em formato serializável
    return result.map((link) => ({
      ...link,
      imagem: link.imagem ? link.imagem.toString() : null,
    }));
  }),

  criar: publicProcedure
    .input(z.object({
      titulo: z.string(),
      url: z.string().url(),
      descricao: z.string().optional(),
      clienteId: z.string().uuid().optional(),
      tipo: z.enum(["cliente", "parceria"]),
      imagem: z.string().url().optional(), // ✅ imagem como URL
    }))
    .mutation(({ input }) => {
      return db.insert(links).values({
        ...input,
        descricao: input.descricao ?? "",
      });
    }),

  editar: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      titulo: z.string(),
      url: z.string().url(),
      descricao: z.string().optional(),
      tipo: z.enum(["cliente", "parceria"]),
      imagem: z.string().url().optional(), // ✅ corrigido aqui também
    }))
    .mutation(({ input }) =>
      db.update(links)
        .set({
          titulo: input.titulo,
          url: input.url,
          descricao: input.descricao ?? "",
          tipo: input.tipo,
          imagem: input.imagem,
          updatedAt: new Date(),
        })
        .where(eq(links.id, input.id))
    ),

  deletar: publicProcedure
    .input(z.string().uuid())
    .mutation(({ input }) => db.delete(links).where(eq(links.id, input))),
});
