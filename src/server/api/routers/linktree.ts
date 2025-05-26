import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { db } from "@/server/db"
import { links } from "@/server/db/schema"
import { eq, isNotNull } from "drizzle-orm"

export const linktreeRouter = createTRPCRouter({
  listar: publicProcedure.query(async () => {
    const result = await db.query.links.findMany()

    return result.map((link) => {
      let imagemBase64 = null
      let mimeType = "image/png" // default

      if (link.imagem) {
        try {
          // Converte Uint8Array para Buffer e depois para base64
          const buffer = Buffer.from(link.imagem)
          imagemBase64 = buffer.toString("base64")

          // Detecta o tipo de imagem pelos primeiros bytes
          if (buffer.length > 0) {
            const firstBytes = buffer.subarray(0, 4)
            if (firstBytes[0] === 0xff && firstBytes[1] === 0xd8) {
              mimeType = "image/jpeg"
            } else if (
              firstBytes[0] === 0x89 &&
              firstBytes[1] === 0x50 &&
              firstBytes[2] === 0x4e &&
              firstBytes[3] === 0x47
            ) {
              mimeType = "image/png"
            } else if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46) {
              mimeType = "image/gif"
            } else if (
              firstBytes[0] === 0x52 &&
              firstBytes[1] === 0x49 &&
              firstBytes[2] === 0x46 &&
              firstBytes[3] === 0x46
            ) {
              mimeType = "image/webp"
            }
          }

          console.log(`Link ${link.titulo}: imagem detectada, tipo: ${mimeType}, tamanho: ${buffer.length} bytes`)
        } catch (error) {
          console.error(`Erro ao processar imagem do link ${link.titulo}:`, error)
        }
      }

      return {
        ...link,
        imagem: imagemBase64,
        mimeType,
      }
    })
  }),

  listarClientes: publicProcedure.query(async () => {
    const result = await db.query.links.findMany({
      where: eq(links.tipo, "cliente"),
    })

    return result.map((link) => {
      let imagemBase64 = null
      let mimeType = "image/png"

      if (link.imagem) {
        try {
          const buffer = Buffer.from(link.imagem)
          imagemBase64 = buffer.toString("base64")

          // Detecta o tipo de imagem
          if (buffer.length > 0) {
            const firstBytes = buffer.subarray(0, 4)
            if (firstBytes[0] === 0xff && firstBytes[1] === 0xd8) {
              mimeType = "image/jpeg"
            } else if (
              firstBytes[0] === 0x89 &&
              firstBytes[1] === 0x50 &&
              firstBytes[2] === 0x4e &&
              firstBytes[3] === 0x47
            ) {
              mimeType = "image/png"
            } else if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46) {
              mimeType = "image/gif"
            } else if (
              firstBytes[0] === 0x52 &&
              firstBytes[1] === 0x49 &&
              firstBytes[2] === 0x46 &&
              firstBytes[3] === 0x46
            ) {
              mimeType = "image/webp"
            }
          }
        } catch (error) {
          console.error(`Erro ao processar imagem do cliente ${link.titulo}:`, error)
        }
      }

      return {
        ...link,
        imagem: imagemBase64,
        mimeType,
      }
    })
  }),

  listarParcerias: publicProcedure.query(async () => {
    const result = await db.query.links.findMany({
      where: eq(links.tipo, "parceria"),
    })

    return result.map((link) => {
      let imagemBase64 = null
      let mimeType = "image/png"

      if (link.imagem) {
        try {
          const buffer = Buffer.from(link.imagem)
          imagemBase64 = buffer.toString("base64")

          // Detecta o tipo de imagem
          if (buffer.length > 0) {
            const firstBytes = buffer.subarray(0, 4)
            if (firstBytes[0] === 0xff && firstBytes[1] === 0xd8) {
              mimeType = "image/jpeg"
            } else if (
              firstBytes[0] === 0x89 &&
              firstBytes[1] === 0x50 &&
              firstBytes[2] === 0x4e &&
              firstBytes[3] === 0x47
            ) {
              mimeType = "image/png"
            } else if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46) {
              mimeType = "image/gif"
            } else if (
              firstBytes[0] === 0x52 &&
              firstBytes[1] === 0x49 &&
              firstBytes[2] === 0x46 &&
              firstBytes[3] === 0x46
            ) {
              mimeType = "image/webp"
            }
          }
        } catch (error) {
          console.error(`Erro ao processar imagem da parceria ${link.titulo}:`, error)
        }
      }

      return {
        ...link,
        imagem: imagemBase64,
        mimeType,
      }
    })
  }),

  criar: publicProcedure
    .input(
      z
        .object({
          titulo: z.string().min(1, "Título é obrigatório"),
          url: z.string().optional(), // Removido .url() para aceitar string vazia
          descricao: z.string().optional(),
          clienteId: z.string().uuid().optional(),
          tipo: z.enum(["cliente", "parceria"]),
          imagem: z.string().optional(), // base64 data URL
        })
        .refine(
          (data) => {
            // Se for parceria, a URL deve ser uma URL válida e não vazia
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
      // Para clientes, a URL sempre será null
      // Para parcerias, usa a URL fornecida
      const urlFinal = input.tipo === "cliente" ? null : input.url || null

      let imagemBuffer = null
      if (input.imagem) {
        try {
          // Remove o prefixo data:image/...;base64, se existir
          const base64Data = input.imagem.replace(/^data:image\/[a-z]+;base64,/, "")
          imagemBuffer = Buffer.from(base64Data, "base64")
          console.log(`Salvando imagem para ${input.titulo}: ${imagemBuffer.length} bytes`)
        } catch (error) {
          console.error("Erro ao processar imagem:", error)
          throw new Error("Erro ao processar a imagem")
        }
      }

      await db.insert(links).values({
        titulo: input.titulo,
        url: urlFinal,
        descricao: input.descricao ?? "",
        clienteId: input.clienteId ?? null,
        tipo: input.tipo,
        imagem: imagemBuffer,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      return { success: true }
    }),

  editar: publicProcedure
    .input(
      z
        .object({
          id: z.string().uuid(),
          titulo: z.string().min(1, "Título é obrigatório"),
          url: z.string().optional(), // Removido .url() para aceitar string vazia
          descricao: z.string().optional(),
          tipo: z.enum(["cliente", "parceria"]),
          imagem: z.string().optional(), // base64 data URL
        })
        .refine(
          (data) => {
            // Se for parceria, a URL deve ser uma URL válida e não vazia
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
      // Para clientes, a URL sempre será null
      // Para parcerias, usa a URL fornecida
      const urlFinal = input.tipo === "cliente" ? null : input.url || null

      let imagemBuffer = null
      if (input.imagem) {
        try {
          // Remove o prefixo data:image/...;base64, se existir
          const base64Data = input.imagem.replace(/^data:image\/[a-z]+;base64,/, "")
          imagemBuffer = Buffer.from(base64Data, "base64")
          console.log(`Editando imagem para ${input.titulo}: ${imagemBuffer.length} bytes`)
        } catch (error) {
          console.error("Erro ao processar imagem:", error)
          throw new Error("Erro ao processar a imagem")
        }
      }

      const updateData: any = {
        titulo: input.titulo,
        url: urlFinal,
        descricao: input.descricao ?? "",
        tipo: input.tipo,
        updatedAt: new Date(),
      }

      // Só atualiza a imagem se foi fornecida
      if (imagemBuffer !== null) {
        updateData.imagem = imagemBuffer
      }

      await db.update(links).set(updateData).where(eq(links.id, input.id))

      return { success: true }
    }),

  deletar: publicProcedure.input(z.string().uuid()).mutation(async ({ input }) => {
    await db.delete(links).where(eq(links.id, input))
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
      let imagemBase64 = null
      let mimeType = "image/png"

      if (link.imagem) {
        try {
          const buffer = Buffer.from(link.imagem)
          imagemBase64 = buffer.toString("base64")

          // Detecta o tipo de imagem
          if (buffer.length > 0) {
            const firstBytes = buffer.subarray(0, 4)
            if (firstBytes[0] === 0xff && firstBytes[1] === 0xd8) {
              mimeType = "image/jpeg"
            } else if (
              firstBytes[0] === 0x89 &&
              firstBytes[1] === 0x50 &&
              firstBytes[2] === 0x4e &&
              firstBytes[3] === 0x47
            ) {
              mimeType = "image/png"
            } else if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46) {
              mimeType = "image/gif"
            } else if (
              firstBytes[0] === 0x52 &&
              firstBytes[1] === 0x49 &&
              firstBytes[2] === 0x46 &&
              firstBytes[3] === 0x46
            ) {
              mimeType = "image/webp"
            }
          }
        } catch (error) {
          console.error(`Erro ao processar imagem ${link.titulo}:`, error)
        }
      }

      return {
        id: link.id,
        titulo: link.titulo,
        imagem: imagemBase64,
        mimeType,
      }
    })
  }),
})
