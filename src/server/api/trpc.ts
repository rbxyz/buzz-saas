import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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
interface UserPayload {
  id: number;
  email: string;
  role: "superadmin" | "admin";
}

const isAuthed = t.middleware(async ({ ctx, next }) => {
  const authHeader = ctx.headers.get("authorization");

  if (!authHeader) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(
      authHeader,
      process.env.JWT_SECRET ?? "your-secret-key",
    ) as UserPayload;

    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.id),
    });

    if (!user || !user.active) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Usuário inválido ou inativo.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Token inválido: ${error.message}`,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro ao autenticar.",
    });
  }
});

export const protectedProcedure = t.procedure.use(timingMiddleware).use(isAuthed);

/**
 * EXPORTS
 */
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
