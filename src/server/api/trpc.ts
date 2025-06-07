import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/server/db";

/**
 * CONTEXT
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    ...opts,
  };
};

/**
 * INITIALIZATION
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * MIDDLEWARES
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * PUBLIC PROCEDURE (sem autenticação)
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * PROTECTED PROCEDURE (com autenticação)
 * Adapte esse middleware com seu sistema de autenticação, por exemplo:
 * ctx.session ou token.
 */
const isAuthed = t.middleware(async ({ ctx, next }) => {
  // Exemplo básico: verifique se existe algum token/header obrigatório
  if (!ctx.headers.get("authorization")) {
    throw new Error("Not authenticated");
  }

  return next({
    ctx: {
      ...ctx,
      user: { id: "placeholder" }, // substitua com lógica real
    },
  });
});

export const protectedProcedure = t.procedure.use(timingMiddleware).use(isAuthed);

/**
 * EXPORTS
 */
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
