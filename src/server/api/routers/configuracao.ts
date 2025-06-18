import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import { configuracoes, servicos } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

export const configuracaoRouter = createTRPCRouter({
  // Adicionar o procedimento listar que está faltando
  listar: publicProcedure.query(async () => {
    try {
      console.log("🔍 [CONFIGURACAO] Iniciando busca de configuração...")

      const config = await db.query.configuracoes.findFirst({
        orderBy: (configuracoes, { desc }) => [desc(configuracoes.createdAt)],
      })

      console.log("📋 [CONFIGURACAO] Configuração encontrada:", {
        existe: !!config,
        id: config?.id,
        userId: config?.userId,
        nomeEmpresa: config?.nomeEmpresa,
      })

      if (!config) {
        console.log("❌ [CONFIGURACAO] Nenhuma configuração encontrada, retornando padrão")
        // Retornar configuração padrão se não existir
        return {
          id: null,
          userId: null,
          nomeEmpresa: "",
          telefone: "",
          endereco: "",
          logoUrl: "",
          corPrimaria: "#3B82F6",
          corSecundaria: "#1E40AF",
          zapiInstanceId: "",
          zapiToken: "",
          zapiClientToken: "",
          aiEnabled: false,
          whatsappAgentEnabled: false,
          servicos: [], // Adicionar array vazio de serviços
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      console.log("🔍 [CONFIGURACAO] Buscando serviços para userId:", config.userId)

      // Buscar serviços associados ao usuário da configuração
      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, config.userId),
        orderBy: (servicos, { asc }) => [asc(servicos.nome)],
      })

      console.log("🎯 [CONFIGURACAO] Serviços encontrados:", servicosUsuario)

      // Converter serviços para o formato esperado pelo componente
      const servicosFormatados = servicosUsuario.map((servico) => {
        console.log("🔄 [CONFIGURACAO] Processando serviço:", servico)
        return {
          nome: servico.nome,
          preco: Number.parseFloat(servico.preco?.toString() ?? "0"),
          duracaoMinutos: servico.duracao,
        }
      })

      console.log("✅ [CONFIGURACAO] Serviços formatados:", servicosFormatados)

      const resultado = {
        ...config,
        servicos: servicosFormatados,
      }

      console.log("🏁 [CONFIGURACAO] Resultado final:", resultado)
      return resultado
    } catch (error) {
      console.error("❌ [CONFIGURACAO] Erro ao listar configurações:", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao listar configurações",
      })
    }
  }),

  obterConfiguracao: publicProcedure.query(async () => {
    try {
      console.log("🔍 [CONFIGURACAO] Iniciando obtenção de configuração...")

      const config = await db.query.configuracoes.findFirst()

      console.log("📋 [CONFIGURACAO] Configuração obtida:", {
        existe: !!config,
        id: config?.id,
        userId: config?.userId,
      })

      if (!config) {
        console.log("❌ [CONFIGURACAO] Nenhuma configuração encontrada, retornando padrão")
        // Retornar configuração padrão se não existir
        return {
          id: null,
          userId: null,
          nomeEmpresa: "",
          telefone: "",
          endereco: "",
          logoUrl: "",
          corPrimaria: "#3B82F6",
          corSecundaria: "#1E40AF",
          zapiInstanceId: "",
          zapiToken: "",
          zapiClientToken: "",
          aiEnabled: false,
          whatsappAgentEnabled: false,
          servicos: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      // Buscar serviços associados ao usuário da configuração
      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, config.userId),
        orderBy: (servicos, { asc }) => [asc(servicos.nome)],
      })

      console.log("🎯 [CONFIGURACAO] Serviços encontrados para obter:", servicosUsuario)

      // Converter serviços para o formato esperado pelo componente
      const servicosFormatados = servicosUsuario.map((servico) => ({
        nome: servico.nome,
        preco: Number.parseFloat(servico.preco?.toString() ?? "0"),
        duracaoMinutos: servico.duracao,
      }))

      const resultado = {
        ...config,
        servicos: servicosFormatados,
      }

      console.log("🏁 [CONFIGURACAO] Resultado final obter:", resultado)
      return resultado
    } catch (error) {
      console.error("❌ [CONFIGURACAO] Erro ao obter configuração:", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao obter configuração",
      })
    }
  }),

  atualizarConfiguracao: publicProcedure
    .input(
      z.object({
        id: z.number().optional().nullable(),
        userId: z.number().optional().nullable(),
        nomeEmpresa: z.string().optional(),
        telefone: z.string().optional(),
        endereco: z.string().optional(),
        logoUrl: z.string().optional(),
        corPrimaria: z.string().optional(),
        corSecundaria: z.string().optional(),
        zapiInstanceId: z.string().optional(),
        zapiToken: z.string().optional(),
        zapiClientToken: z.string().optional(),
        aiEnabled: z.boolean().optional(),
        whatsappAgentEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        console.log("🔧 Atualizando configuração:", input)

        const { id, ...configData } = input

        // Se tem ID, é uma atualização
        if (id) {
          // Remover propriedades com valor null/undefined
          const updateData = Object.fromEntries(
            Object.entries(configData).filter(([_, value]) => value !== null && value !== undefined)
          )

          const updated = await db
            .update(configuracoes)
            .set({
              ...updateData,
              updatedAt: new Date(),
            })
            .where(eq(configuracoes.id, id))
            .returning()

          if (updated.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Configuração não encontrada",
            })
          }

          return updated[0]
        } else {
          // Verificar se já existe configuração
          const existing = await db.query.configuracoes.findFirst()

          if (existing) {
            // Se já existe, atualizar
            console.log("📝 Configuração já existe, atualizando...")
            // Remover propriedades com valor null/undefined
            const updateData = Object.fromEntries(
              Object.entries(configData).filter(([_, value]) => value !== null && value !== undefined)
            )

            const updated = await db
              .update(configuracoes)
              .set({
                ...updateData,
                updatedAt: new Date(),
              })
              .where(eq(configuracoes.id, existing.id))
              .returning()

            return updated[0]
          } else {
            // Se não existe, criar
            // Precisamos garantir que userId seja fornecido, pois é NOT NULL
            if (!configData.userId) {
              // Tentar obter o primeiro usuário disponível
              const firstUser = await db.query.users.findFirst()
              if (!firstUser) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "É necessário fornecer um userId válido",
                })
              }
              configData.userId = firstUser.id
            }

            // Garantir que temos um userId válido
            if (!configData.userId) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Erro interno: userId não encontrado",
              })
            }

            const created = await db
              .insert(configuracoes)
              .values({
                userId: configData.userId,
                nomeEmpresa: configData.nomeEmpresa,
                telefone: configData.telefone,
                endereco: configData.endereco,
                logoUrl: configData.logoUrl,
                corPrimaria: configData.corPrimaria,
                corSecundaria: configData.corSecundaria,
                zapiInstanceId: configData.zapiInstanceId,
                zapiToken: configData.zapiToken,
                zapiClientToken: configData.zapiClientToken,
                aiEnabled: configData.aiEnabled,
                whatsappAgentEnabled: configData.whatsappAgentEnabled,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning()

            console.log("✅ Nova configuração criada com sucesso!")
            return created[0]
          }
        }
      } catch (error) {
        console.error("❌ Erro ao atualizar configuração:", error)

        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao salvar configuração",
        })
      }
    }),

  atualizarServicos: publicProcedure
    .input(
      z.object({
        id: z.number().optional().nullable(),
        servicos: z.array(
          z.object({
            nome: z.string(),
            preco: z.number(),
            duracaoMinutos: z.number().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        console.log("🔧 Atualizando serviços:", input)

        // Buscar configuração existente
        const existing = await db.query.configuracoes.findFirst()

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Configuração não encontrada",
          })
        }

        // Remover todos os serviços existentes do usuário
        await db.delete(servicos).where(eq(servicos.userId, existing.userId))

        // Inserir novos serviços
        if (input.servicos.length > 0) {
          const novosServicos = input.servicos.map((servico) => ({
            userId: existing.userId,
            nome: servico.nome,
            preco: servico.preco.toString(),
            duracao: servico.duracaoMinutos ?? 30,
            ativo: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))

          await db.insert(servicos).values(novosServicos)
        }

        console.log("✅ Serviços atualizados com sucesso!")

        // Retornar configuração atualizada com serviços
        const servicosAtualizados = await db.query.servicos.findMany({
          where: eq(servicos.userId, existing.userId),
          orderBy: (servicos, { asc }) => [asc(servicos.nome)],
        })

        const servicosFormatados = servicosAtualizados.map((servico) => ({
          nome: servico.nome,
          preco: Number.parseFloat(servico.preco?.toString() ?? "0"),
          duracaoMinutos: servico.duracao,
        }))

        return {
          ...existing,
          servicos: servicosFormatados,
        }
      } catch (error) {
        console.error("❌ Erro ao atualizar serviços:", error)

        if (error instanceof TRPCError) {
          throw error
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao salvar serviços",
        })
      }
    }),
})
