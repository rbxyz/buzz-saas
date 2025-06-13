import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { links } from "@/server/db/schema"
import { eq, isNotNull } from "drizzle-orm"

export const linktreeRouter = createTRPCRouter({
  listar: publicProcedure.query(async () => {
    console.log("🔍 [LINKTREE] Buscando todos os links...")

    const result = await db.query.links.findMany()
    console.log("📋 [LINKTREE] Links encontrados:", result.length)

    return result.map((link) => {
      console.log(`🔍 [LINKTREE] Processando link ${link.titulo}, tipo imagem:`, typeof link.imagem)

      // Se já é uma string, assumimos que é base64
      if (typeof link.imagem === "string" && link.imagem) {
        return {
          ...link,
          imagem: link.imagem,
          mimeType: "image/png", // Tipo padrão
        }
      }

      // Se não há imagem
      return {
        ...link,
        imagem: null,
        mimeType: null,
      }
    })
  }),

  listarClientes: publicProcedure.query(async () => {
    console.log("🔍 [LINKTREE] Buscando clientes...")

    const result = await db.query.links.findMany({
      where: eq(links.tipo, "cliente"),
    })

    console.log("👥 [LINKTREE] Clientes encontrados:", result.length)

    return result.map((link) => {
      if (typeof link.imagem === "string" && link.imagem) {
        return {
          ...link,
          imagem: link.imagem,
          mimeType: "image/png",
        }
      }

      return {
        ...link,
        imagem: null,
        mimeType: null,
      }
    })
  }),

  listarClientesLanding: publicProcedure.query(async () => {
    const result = await db.query.links.findMany({
      where: eq(links.tipo, "cliente"),
      limit: 5,
      orderBy: [links.createdAt],
    })

    return result.map((link) => {
      if (typeof link.imagem === "string" && link.imagem) {
        return {
          ...link,
          imagem: link.imagem,
          mimeType: "image/png",
        }
      }

      return {
        ...link,
        imagem: null,
        mimeType: null,
      }
    })
  }),

  listarParcerias: publicProcedure.query(async () => {
    const result = await db.query.links.findMany({
      where: eq(links.tipo, "parceria"),
    })

    return result.map((link) => {
      if (typeof link.imagem === "string" && link.imagem) {
        return {
          ...link,
          imagem: link.imagem,
          mimeType: "image/png",
        }
      }

      return {
        ...link,
        imagem: null,
        mimeType: null,
      }
    })
  }),

  criar: publicProcedure
    .input(
      z
        .object({
          titulo: z.string().min(1, "Título é obrigatório"),
          url: z.string().optional(),
          descricao: z.string().optional(),
          clienteId: z.string().uuid().optional(),
          tipo: z.enum(["cliente", "parceria"]),
          imagem: z.string().optional(), // base64 data URL
        })
        .refine(
          (data) => {
            if (data.tipo === "parceria") {
              return data.url && data.url.trim().length > 0 && z.string().url().safeParse(data.url).success
            }
            return true
          },
          {
            message: "URL válida é obrigatória para parcerias",
            path: ["url"],
          },
        ),
    )
    .mutation(async ({ input }) => {
      console.log("🆕 [LINKTREE] Criando link:", { titulo: input.titulo, tipo: input.tipo })

      const urlFinal = input.tipo === "cliente" ? null : (input.url ?? null)

      // Processar imagem - extrair apenas o base64 sem o prefixo data:
      let imagemFinal: string | null = null
      if (input.imagem) {
        try {
          // Remove o prefixo data:image/...;base64, se existir
          imagemFinal = input.imagem.replace(/^data:image\/[a-z]+;base64,/, "")
          console.log(`📷 [LINKTREE] Salvando imagem para ${input.titulo}: ${imagemFinal.length} caracteres base64`)
        } catch (error) {
          console.error("❌ [LINKTREE] Erro ao processar imagem:", error)
          throw new Error("Erro ao processar a imagem")
        }
      }

      await db.insert(links).values({
        titulo: input.titulo,
        url: urlFinal,
        descricao: input.descricao ?? "",
        clienteId: input.clienteId ?? null,
        tipo: input.tipo,
        imagem: imagemFinal,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      console.log("✅ [LINKTREE] Link criado com sucesso")
      return { success: true }
    }),

  editar: publicProcedure
    .input(
      z
        .object({
          id: z.string().uuid(),
          titulo: z.string().min(1, "Título é obrigatório"),
          url: z.string().optional(),
          descricao: z.string().optional(),
          tipo: z.enum(["cliente", "parceria"]),
          imagem: z.string().optional(), // base64 data URL
        })
        .refine(
          (data) => {
            if (data.tipo === "parceria") {
              return data.url && data.url.trim().length > 0 && z.string().url().safeParse(data.url).success
            }
            return true
          },
          {
            message: "URL válida é obrigatória para parcerias",
            path: ["url"],
          },
        ),
    )
    .mutation(async ({ input }) => {
      console.log("✏️ [LINKTREE] Editando link:", input.id)

      const urlFinal = input.tipo === "cliente" ? null : (input.url ?? null)

      const updateData: {
        titulo: string
        url: string | null
        descricao: string
        tipo: "cliente" | "parceria"
        updatedAt: Date
        imagem?: string | null
      } = {
        titulo: input.titulo,
        url: urlFinal,
        descricao: input.descricao ?? "",
        tipo: input.tipo,
        updatedAt: new Date(),
      }

      // Só atualiza a imagem se foi fornecida
      if (input.imagem) {
        try {
          updateData.imagem = input.imagem.replace(/^data:image\/[a-z]+;base64,/, "")
          console.log(
            `📷 [LINKTREE] Editando imagem para ${input.titulo}: ${updateData.imagem.length} caracteres base64`,
          )
        } catch (error) {
          console.error("❌ [LINKTREE] Erro ao processar imagem:", error)
          throw new Error("Erro ao processar a imagem")
        }
      }

      await db.update(links).set(updateData).where(eq(links.id, input.id))

      console.log("✅ [LINKTREE] Link editado com sucesso")
      return { success: true }
    }),

  deletar: publicProcedure.input(z.string().uuid()).mutation(async ({ input }) => {
    console.log("🗑️ [LINKTREE] Deletando link:", input)

    await db.delete(links).where(eq(links.id, input))

    console.log("✅ [LINKTREE] Link deletado com sucesso")
    return { success: true }
  }),

  getImages: publicProcedure.query(async () => {
    const result = await db.query.links.findMany({
      columns: {
        id: true,
        titulo: true,
        imagem: true,
      },
      where: isNotNull(links.imagem),
    })

    return result.map((link) => {
      if (typeof link.imagem === "string" && link.imagem) {
        return {
          id: link.id,
          titulo: link.titulo,
          imagem: link.imagem,
          mimeType: "image/png",
        }
      }

      return {
        id: link.id,
        titulo: link.titulo,
        imagem: null,
        mimeType: null,
      }
    })
  }),
})
