import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc"
import { db } from "@/server/db"
import { configuracoes, servicos } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

export const configuracaoRouter = createTRPCRouter({
  // Alias para compatibilidade com componentes existentes
  listar: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;
      console.log("🔍 [CONFIG-LISTAR] Buscando configuração para userId:", userId);

      const config = await db.query.configuracoes.findFirst({
        where: eq(configuracoes.userId, userId),
      });

      console.log("📋 [CONFIG-LISTAR] Configuração encontrada:", config ? "SIM" : "NÃO");

      if (!config) {
        // Retornar uma configuração padrão se não existir
        return {
          id: null,
          userId: userId,
          nomeEmpresa: "",
          telefone: "",
          endereco: "",
          logoUrl: "",
          corPrimaria: "#3B82F6",
          corSecundaria: "#1E40AF",
          servicos: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      console.log("🔍 [CONFIG-LISTAR] Buscando serviços para userId:", userId);
      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, userId),
        orderBy: (servicos, { asc }) => [asc(servicos.nome)],
      });

      console.log("📦 [CONFIG-LISTAR] Serviços encontrados:", servicosUsuario.length, servicosUsuario);

      const servicosFormatados = servicosUsuario.map((servico) => ({
        nome: servico.nome,
        preco: Number.parseFloat(servico.preco?.toString() ?? "0"),
        duracaoMinutos: servico.duracao,
      }));

      console.log("✅ [CONFIG-LISTAR] Serviços formatados:", servicosFormatados);

      return {
        ...config,
        servicos: servicosFormatados,
      };
    } catch (error) {
      console.error("❌ [CONFIG-LISTAR] Erro ao listar configuração:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao listar sua configuração",
      });
    }
  }),

  obterConfiguracaoCompleta: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id
      console.log("🔍 [CONFIG] Buscando configuração para userId:", userId)

      const config = await db.query.configuracoes.findFirst({
        where: eq(configuracoes.userId, userId),
      })

      console.log("📋 [CONFIG] Configuração encontrada:", config ? "SIM" : "NÃO")

      if (!config) {
        // Retornar uma configuração padrão se não existir, já associada ao usuário
        return {
          id: null,
          userId: userId,
          nomeEmpresa: "",
          telefone: "",
          endereco: "",
          logoUrl: "",
          corPrimaria: "#3B82F6",
          corSecundaria: "#1E40AF",
          servicos: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }

      console.log("🔍 [CONFIG] Buscando serviços para userId:", userId)
      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, userId),
        orderBy: (servicos, { asc }) => [asc(servicos.nome)],
      })

      console.log("📦 [CONFIG] Serviços encontrados:", servicosUsuario.length, servicosUsuario)

      const servicosFormatados = servicosUsuario.map((servico) => ({
        nome: servico.nome,
        preco: Number.parseFloat(servico.preco?.toString() ?? "0"),
        duracaoMinutos: servico.duracao,
      }))

      console.log("✅ [CONFIG] Serviços formatados:", servicosFormatados)

      return {
        ...config,
        servicos: servicosFormatados,
      }
    } catch (error) {
      console.error("❌ [CONFIGURACAO] Erro ao obter configuração:", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao obter sua configuração",
      })
    }
  }),

  verificarConfiguracaoInicial: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id

      const config = await db.query.configuracoes.findFirst({
        where: eq(configuracoes.userId, userId),
      })

      if (!config) {
        return {
          configuracaoInicialCompleta: false,
          camposFaltantes: ['nome da empresa', 'telefone', 'endereço'],
          mensagem: "Configure as informações básicas do seu estabelecimento para começar a usar o sistema."
        }
      }

      const camposFaltantes: string[] = []

      if (!config.nomeEmpresa || config.nomeEmpresa.trim() === '') {
        camposFaltantes.push('nome da empresa')
      }

      if (!config.telefone || config.telefone.trim() === '') {
        camposFaltantes.push('telefone')
      }

      if (!config.endereco || config.endereco.trim() === '') {
        camposFaltantes.push('endereço')
      }

      return {
        configuracaoInicialCompleta: camposFaltantes.length === 0,
        camposFaltantes,
        mensagem: camposFaltantes.length > 0
          ? `Para completar a configuração, preencha: ${camposFaltantes.join(', ')}.`
          : "Configuração inicial completa!"
      }
    } catch (error) {
      console.error("❌ [CONFIGURACAO] Erro ao verificar configuração inicial:", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao verificar configuração inicial",
      })
    }
  }),

  atualizarConfiguracao: protectedProcedure
    .input(
      z.object({
        nomeEmpresa: z.string().optional(),
        telefone: z.string().optional(),
        endereco: z.string().optional(),
        logoUrl: z.string().optional(),
        corPrimaria: z.string().optional(),
        corSecundaria: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      // Verificar se é a primeira configuração (configuração inicial)
      const existingConfig = await db.query.configuracoes.findFirst({
        where: eq(configuracoes.userId, userId),
      })

      const isFirstTimeSetup = !existingConfig

      // Validação específica para configuração inicial
      if (isFirstTimeSetup) {
        const missingFields: string[] = []

        if (!input.nomeEmpresa || input.nomeEmpresa.trim() === '') {
          missingFields.push('nome da empresa')
        }

        if (!input.telefone || input.telefone.trim() === '') {
          missingFields.push('telefone')
        }

        if (!input.endereco || input.endereco.trim() === '') {
          missingFields.push('endereço')
        }

        if (missingFields.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Para completar a configuração inicial, preencha os seguintes campos: ${missingFields.join(', ')}.`,
          })
        }
      }

      // Validação para atualizações (nome da empresa sempre obrigatório)
      if (!isFirstTimeSetup && (!input.nomeEmpresa || input.nomeEmpresa.trim() === '')) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "O nome da empresa é obrigatório.",
        })
      }

      if (existingConfig) {
        await db
          .update(configuracoes)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(configuracoes.userId, userId))
      } else {
        await db.insert(configuracoes).values({ ...input, userId })
      }

      return {
        success: true,
        message: isFirstTimeSetup
          ? "Configuração inicial concluída com sucesso!"
          : "Configurações da conta salvas."
      }
    }),



  updateServicos: protectedProcedure
    .input(
      z.array(
        z.object({
          nome: z.string(),
          preco: z.number(),
          duracaoMinutos: z.number(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // 1. Deletar todos os serviços existentes para este usuário
      await db.delete(servicos).where(eq(servicos.userId, userId));

      // 2. Inserir os novos serviços
      if (input.length > 0) {
        const servicosParaInserir = input.map((s) => ({
          userId,
          nome: s.nome,
          preco: s.preco.toString(),
          duracao: s.duracaoMinutos,
          ativo: true,
        }));
        await db.insert(servicos).values(servicosParaInserir);
      }

      return { success: true, message: "Lista de serviços atualizada." };
    }),
})
