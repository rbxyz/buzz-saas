import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { randomBytes } from "crypto"

const JWT_SECRET = process.env.JWT_SECRET ?? "your-secret-key"

function generateDefaultCredentials() {
  const randomSuffix = Math.floor(Math.random() * 10000)
  const username = `user${randomSuffix}`
  const password = randomBytes(6)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
  return { username, password }
}

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("🔐 Tentativa de login para:", input.email)

      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      })

      if (!user) {
        console.log("❌ Usuário não encontrado:", input.email)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciais inválidas",
        })
      }

      console.log("👤 Usuário encontrado:", user.email)
      console.log("🔑 Senha fornecida:", input.password)
      console.log("🔒 Hash armazenado:", user.password)

      const validPassword = await bcrypt.compare(input.password, user.password)
      console.log("✅ Senha válida?", validPassword)

      if (!validPassword) {
        console.log("❌ Senha inválida para usuário:", input.email)

        // Gerar hash para debug e mostrar no console
        const debugHash = await bcrypt.hash(input.password, 12)
        console.log("🔧 Hash que seria gerado agora:", debugHash)

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciais inválidas",
        })
      }

      if (!user.active) {
        console.log("❌ Usuário inativo:", input.email)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Conta de usuário está inativa",
        })
      }

      await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id))

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "24h" },
      )

      console.log("🎉 Login bem-sucedido para:", user.email)

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }
    }),

  // Procedimento para gerar hash correto
  generateHash: publicProcedure.input(z.object({ password: z.string() })).mutation(async ({ input }) => {
    const hash = await bcrypt.hash(input.password, 12)
    console.log(`🔐 Hash gerado para "${input.password}":`, hash)

    return {
      password: input.password,
      hash: hash,
      message: `Use este hash no banco de dados para a senha "${input.password}"`,
    }
  }),

  // Procedimento para atualizar senha diretamente
  forceUpdatePassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        newPassword: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      })

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        })
      }

      const newHash = await bcrypt.hash(input.newPassword, 12)
      console.log(`🔐 Novo hash para ${input.email}:`, newHash)

      await db
        .update(users)
        .set({
          password: newHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))

      return {
        success: true,
        email: input.email,
        newHash: newHash,
        message: `Senha atualizada para ${input.email}`,
      }
    }),

  createUser: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6).optional(),
        role: z.enum(["admin", "superadmin"]),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      })

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Usuário já existe",
        })
      }

      const { username, password } = generateDefaultCredentials()
      const rawPassword = input.password ?? password

      console.log("🔐 Criando usuário com senha:", rawPassword)

      const hashedPassword = await bcrypt.hash(rawPassword, 12)
      console.log("🔒 Hash gerado:", hashedPassword)

      const newUser = await db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: input.role,
          phone: input.phone,
          login: username,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      return {
        id: newUser[0]?.id,
        name: newUser[0]?.name,
        email: newUser[0]?.email,
        login: username,
        password: rawPassword,
        role: newUser[0]?.role,
      }
    }),

  updateUser: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6).optional(),
        role: z.enum(["admin", "superadmin"]),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      })

      if (!existingUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        })
      }

      const emailInUse = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      })

      if (emailInUse && emailInUse.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email já está em uso por outro usuário",
        })
      }

      const updateData: Record<string, unknown> = {
        name: input.name,
        email: input.email,
        role: input.role,
        phone: input.phone,
        updatedAt: new Date(),
      }

      if (input.password) {
        console.log("🔐 Atualizando senha para usuário:", input.email)
        updateData.password = await bcrypt.hash(input.password, 12)
      }

      await db.update(users).set(updateData).where(eq(users.id, input.id))

      return { success: true }
    }),

  deleteUser: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, input.id),
    })

    if (!existingUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Usuário não encontrado",
      })
    }

    const activeUsers = await db.query.users.findMany({
      where: eq(users.active, true),
    })

    if (activeUsers.length <= 1) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Não é possível excluir o último usuário ativo",
      })
    }

    await db.delete(users).where(eq(users.id, input.id))

    return { success: true }
  }),

  listUsers: publicProcedure.query(async () => {
    const allUsers = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    })

    return allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      lastLogin: user.lastLogin,
    }))
  }),

  verifyToken: publicProcedure.input(z.object({ token: z.string() })).mutation(async ({ input }) => {
    try {
      const decoded = jwt.verify(input.token, JWT_SECRET) as { id: string; email: string; role: string }

      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
      })

      if (!user?.active) {
        return { valid: false, user: null }
      }

      return {
        valid: true,
        user: {
          id: user.id,
          nome: user.name,
          email: user.email,
          funcao: user.role,
        },
      }
    } catch (error) {
      console.log("❌ Token inválido:", error)
      return { valid: false, user: null }
    }
  }),

  checkUsers: publicProcedure.query(async () => {
    const users = await db.query.users.findMany()
    return {
      hasUsers: users.length > 0,
      userCount: users.length,
      users: users.map((u) => ({ email: u.email, name: u.name, role: u.role })),
    }
  }),
})
