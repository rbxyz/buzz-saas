import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { clientes } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const clienteRouter = createTRPCRouter({
  listar: publicProcedure.query(() =>
    db.query.clientes.findMany()
  ),

  getById: publicProcedure
    .input(z.string().uuid())
    .query(({ input }) =>
      db.query.clientes.findFirst({
        where: eq(clientes.id, input),
      })
    ),

  criar: publicProcedure
    .input(
      z.object({
        nome: z.string(),
        dataNascimento: z.string().refine(
          (val) => !isNaN(Date.parse(val)),
          { message: "Data inválida" }
        ),
        email: z.string().email().optional().default(""),
        telefone: z.string().max(20),
        comprasRecentes: z.any().optional(),
      })
    )
    .mutation(({ input }) =>
      db.insert(clientes).values({
        nome: input.nome,
        dataNascimento: input.dataNascimento, // <-- string ISO
        email: input.email ?? "",
        telefone: input.telefone,
        comprasRecentes: input.comprasRecentes ?? null,
      })
    ),

  editar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string(),
        dataNascimento: z.string().refine(
          (val) => !isNaN(Date.parse(val)),
          { message: "Data inválida" }
        ),
        email: z.string().email().optional().default(""),
        telefone: z.string().max(20),
        comprasRecentes: z.any().optional(),
      })
    )
    .mutation(({ input }) =>
      db.update(clientes).set({
        nome: input.nome,
        dataNascimento: input.dataNascimento, // <-- string ISO
        email: input.email ?? "",
        telefone: input.telefone,
        comprasRecentes: input.comprasRecentes ?? null,
        updatedAt: new Date()
      })
      .where(eq(clientes.id, input.id))
    ),

  deletar: publicProcedure
    .input(z.string().uuid())
    .mutation(({ input }) =>
      db.delete(clientes).where(eq(clientes.id, input))
    ),
});
