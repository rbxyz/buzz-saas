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
        nome: z.string().min(1),
        dataNascimento: z
          .string()
          .refine(
            (val) => val === "" || !isNaN(Date.parse(val)),
            { message: "Data inválida" }
          )
          .optional()
          .default(""),
        email: z
          .string()
          .email()
          .or(z.literal("")) // aceita string vazia
          .optional()
          .default(""),
        telefone: z.string().max(20).optional().default(""),
        comprasRecentes: z.any().optional(),
      })
    )
    .mutation(({ input }) =>
      db.insert(clientes).values({
        nome: input.nome,
        dataNascimento: input.dataNascimento === "" ? null : input.dataNascimento,
        email: input.email === "" ? null : input.email,
        telefone: input.telefone === "" ? "" : input.telefone,
        comprasRecentes: input.comprasRecentes ?? null,
      })
    ),  

  editar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(1),
        dataNascimento: z
          .string()
          .refine(
            (val) => val === "" || !isNaN(Date.parse(val)),
            { message: "Data inválida" }
          )
          .optional()
          .default(""),
        email: z
          .string()
          .email()
          .or(z.literal(""))
          .optional()
          .default(""),
        telefone: z.string().max(20).optional().default(""),
        comprasRecentes: z.any().optional(),
      })
    )
    .mutation(({ input }) =>
      db
        .update(clientes)
        .set({
          nome: input.nome,
          dataNascimento: input.dataNascimento === "" ? null : input.dataNascimento,
          email: input.email === "" ? null : input.email,
          telefone: input.telefone === "" ? "" : input.telefone,
          comprasRecentes: input.comprasRecentes ?? null,
          updatedAt: new Date(),
        })
        .where(eq(clientes.id, input.id))
    ),

  deletar: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(clientes).where(eq(clientes.id, input.id));
      return { success: true };
    }),
});
