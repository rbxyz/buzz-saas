import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import { configuracoes } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Enum para os dias da semana
const diasSemanaEnumZod = z.enum([
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
]);

// Schema para o horário personalizado (dia + horários)
const horarioPersonalizadoSchema = z.object({
  dia: diasSemanaEnumZod,
  horaInicio: z.string(),
  horaFim: z.string(),
});

// Helper para gerar o default de horários personalizados
function gerarHorariosPersonalizadosDefault(horaInicio: string, horaFim: string) {
  return diasSemanaEnumZod.options.map((dia) => ({
    dia,
    horaInicio,
    horaFim,
  }));
}

export const configuracaoRouter = createTRPCRouter({
  listar: publicProcedure.query(async () => {
    const resultado = await db.query.configuracoes.findFirst();
    return resultado;
  }),

  salvar: publicProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        nome: z.string(),
        telefone: z.string(),
        endereco: z.string(),
        dias: z.array(diasSemanaEnumZod).min(1),
        horaInicio: z.string(),
        horaFim: z.string(),
        instanceId: z.string(),
        token: z.string(),
        whatsappAtivo: z.boolean(),
        modoTreinoAtivo: z.boolean(),
        contextoIA: z.string(),
        dadosIA: z.string(),
        servicos: z.array(
          z.object({
            nome: z.string(),
            preco: z.number(),
          })
        ),
        horariosPersonalizados: z
          .array(horarioPersonalizadoSchema)
          .optional(), // novo campo opcional
      })
    )
    .mutation(async ({ input }) => {
      const now = new Date();

      // Se não enviou horários personalizados ou veio vazio, gera o default com base nos horários globais
      let horariosPersonalizados = input.horariosPersonalizados;
      if (!horariosPersonalizados || horariosPersonalizados.length === 0) {
        horariosPersonalizados = gerarHorariosPersonalizadosDefault(
          input.horaInicio,
          input.horaFim
        );
      }

      const existente = await db.query.configuracoes.findFirst();

      if (existente) {
        await db
          .update(configuracoes)
          .set({
            nome: input.nome,
            telefone: input.telefone,
            endereco: input.endereco,
            dias: input.dias,
            horaInicio: input.horaInicio,
            horaFim: input.horaFim,
            horariosPersonalizados, // salva aqui o novo campo
            instanceId: input.instanceId,
            token: input.token,
            whatsappAtivo: input.whatsappAtivo,
            modoTreinoAtivo: input.modoTreinoAtivo,
            contextoIA: input.contextoIA,
            dadosIA: input.dadosIA,
            servicos: input.servicos,
            updatedAt: now,
          })
          .where(eq(configuracoes.id, existente.id));

        return { ok: true, tipo: "atualizado" };
      }

      await db.insert(configuracoes).values({
        nome: input.nome,
        telefone: input.telefone,
        endereco: input.endereco,
        dias: input.dias,
        horaInicio: input.horaInicio,
        horaFim: input.horaFim,
        horariosPersonalizados, // salva aqui também
        instanceId: input.instanceId,
        token: input.token,
        whatsappAtivo: input.whatsappAtivo,
        modoTreinoAtivo: input.modoTreinoAtivo,
        contextoIA: input.contextoIA,
        dadosIA: input.dadosIA,
        servicos: input.servicos,
        createdAt: now,
        updatedAt: now,
      });

      return { ok: true, tipo: "criado" };
    }),

  // Mantém os demais procedimentos iguais, sem alteração...
  salvaServicos: publicProcedure
    .input(
      z.object({
        id: z.string(),
        servicos: z
          .array(
            z.object({
              nome: z.string().min(1),
              preco: z.string().min(1),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { id, servicos } = input;
      await db
        .update(configuracoes)
        .set({
          servicos,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, id));
      return { ok: true };
    }),

  salvarHorarios: publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      horaInicioPadrao: z.string(),
      horaFimPadrao: z.string(),
      diasSelecionados: z.array(
        z.object({
          dia: diasSemanaEnumZod,
          horarioPersonalizado: z.boolean(),
          horaInicio: z.string().optional(),
          horaFim: z.string().optional(),
        })
      ),
    })
  )
  .mutation(async ({ input }) => {
    // Constrói o array de dias
    const dias = input.diasSelecionados.map((d) => d.dia);

    // Constrói os horários personalizados, se o dia tiver personalizado = true
    const horariosPersonalizados = input.diasSelecionados
      .filter((d) => d.horarioPersonalizado)
      .map((d) => ({
        dia: d.dia,
        horaInicio: d.horaInicio ?? input.horaInicioPadrao,
        horaFim: d.horaFim ?? input.horaFimPadrao,
      }));

    await db
      .update(configuracoes)
      .set({
        horaInicio: input.horaInicioPadrao,
        horaFim: input.horaFimPadrao,
        dias,
        horariosPersonalizados,
        updatedAt: new Date(),
      })
      .where(eq(configuracoes.id, input.id));

    return { ok: true };
  }),
  
  atualizarConfiguracao: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().optional(),
        telefone: z.string().optional(),
        endereco: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...dadosAtualizar } = input;

      if (Object.keys(dadosAtualizar).length === 0) {
        throw new Error("Nenhum campo para atualizar.");
      }

      await db
        .update(configuracoes)
        .set({
          ...dadosAtualizar,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, id));

      return { ok: true };
    }),

  atualizarDias: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        dias: z.array(diasSemanaEnumZod).min(1),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          dias: input.dias,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id));
      return { ok: true };
    }),

  atualizarHorario: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        horaInicio: z.string(),
        horaFim: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          horaInicio: input.horaInicio,
          horaFim: input.horaFim,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id));
      return { ok: true };
    }),

  atualizarIntegracaoWhatsapp: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        instanceId: z.string(),
        token: z.string(),
        whatsappAtivo: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          instanceId: input.instanceId,
          token: input.token,
          whatsappAtivo: input.whatsappAtivo,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id));
      return { ok: true };
    }),

  atualizarModoTreino: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        modoTreinoAtivo: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          modoTreinoAtivo: input.modoTreinoAtivo,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id));
      return { ok: true };
    }),

  atualizarIA: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        contextoIA: z.string(),
        dadosIA: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          contextoIA: input.contextoIA,
          dadosIA: input.dadosIA,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id));
      return { ok: true };
    }),

  atualizarServicos: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        servicos: z
          .array(
            z.object({
              nome: z.string(),
              preco: z.number(),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(configuracoes)
        .set({
          servicos: input.servicos,
          updatedAt: new Date(),
        })
        .where(eq(configuracoes.id, input.id));
      return { ok: true };
    }),

  getServicos: publicProcedure.query(async () => {
    const resultado = await db.query.configuracoes.findFirst();
    if (!resultado) return [];
    return resultado.servicos ?? [];
  }),

  getHorariosPersonalizados: publicProcedure.query(async () => {
    const resultado = await db.query.configuracoes.findFirst();
    if (!resultado || !resultado.horariosPersonalizados) {
      return {
        horaInicioPadrao: null,
        horaFimPadrao: null,
        dias: [],
      };
    }
    return resultado.horariosPersonalizados;
  }),
  
});
