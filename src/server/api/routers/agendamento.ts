import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/server/db";
import {
  agendamentos,
  clientes,
  intervalosTrabalho,
  servicos,
} from "@/server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import dayjs from "dayjs";
import { sql, desc } from "drizzle-orm";
import { enviarMensagemWhatsApp } from "@/lib/zapi-service";
import { TRPCError } from "@trpc/server";

function getDiaSemanaNumero(date: Date): number {
  return date.getDay(); // 0=Domingo, 1=Segunda, etc.
}

function gerarHorarios(
  inicio: string,
  fim: string,
  duracaoServico: number,
): string[] {
  const horarios: string[] = [];
  const [horaInicio, minutoInicio] = inicio.split(":").map(Number);
  const [horaFim, minutoFim] = fim.split(":").map(Number);

  if (
    horaInicio === undefined ||
    minutoInicio === undefined ||
    horaFim === undefined ||
    minutoFim === undefined
  ) {
    return [];
  }

  const inicioMinutos = horaInicio * 60 + minutoInicio;
  const fimMinutos = horaFim * 60 + minutoFim;

  for (
    let minutos = inicioMinutos;
    minutos + duracaoServico <= fimMinutos;
    minutos += 30
  ) {
    const hora = Math.floor(minutos / 60);
    const minuto = minutos % 60;
    horarios.push(
      `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`,
    );
  }

  return horarios;
}

async function obterColunasReais(nomeTabela: string): Promise<string[]> {
  try {
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = ${nomeTabela}
    `);

    const colunas = (result.rows as { column_name: string }[]).map(
      (row) => row.column_name,
    );
    return colunas;
  } catch {
    return [];
  }
}

export const agendamentoRouter = createTRPCRouter({
  getByData: publicProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const start = dayjs(input.date).startOf("day").toDate();
      const end = dayjs(input.date).endOf("day").toDate();

      const agendamentosDoDia = await db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
          duracaoMinutos: agendamentos.duracaoMinutos,
          cliente: {
            nome: clientes.nome,
          },
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .where(
          and(
            gte(agendamentos.dataHora, start),
            lte(agendamentos.dataHora, end),
          ),
        )
        .orderBy(agendamentos.dataHora);

      return agendamentosDoDia;
    }),

  getByDateRange: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const start = dayjs(input.startDate).startOf("day").toDate();
      const end = dayjs(input.endDate).endOf("day").toDate();

      const agendamentosDoPeriodo = await db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
          duracaoMinutos: agendamentos.duracaoMinutos,
          cliente: {
            nome: clientes.nome,
          },
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .where(
          and(
            gte(agendamentos.dataHora, start),
            lte(agendamentos.dataHora, end),
          ),
        )
        .orderBy(agendamentos.dataHora);

      return agendamentosDoPeriodo;
    }),

  create: protectedProcedure
    .input(
      z.object({
        clienteId: z.number(),
        data: z.string(),
        horario: z.string(),
        servico: z.string(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = parseInt(ctx.user.id, 10);
      if (isNaN(userId)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "ID de usuário inválido.",
        });
      }
      const dataHora = dayjs(`${input.data}T${input.horario}`).toDate();

      const servicoSelecionado = await db.query.servicos.findFirst({
        where: and(
          eq(servicos.userId, userId),
          eq(servicos.nome, input.servico),
          eq(servicos.ativo, true),
        ),
      });

      if (!servicoSelecionado) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Serviço "${input.servico}" não encontrado ou inativo`,
        });
      }

      const valorCobrado = servicoSelecionado.preco;
      const duracaoMinutos = servicoSelecionado.duracao;

      const dataInicio = dayjs(dataHora);
      const dataFim = dataInicio.add(duracaoMinutos, "minute");

      const agendamentosExistentes = await db
        .select({
          dataHora: agendamentos.dataHora,
          duracaoMinutos: agendamentos.duracaoMinutos,
        })
        .from(agendamentos)
        .where(
          and(
            eq(agendamentos.userId, userId),
            gte(agendamentos.dataHora, dataInicio.startOf("day").toDate()),
            lte(agendamentos.dataHora, dataInicio.endOf("day").toDate()),
            eq(agendamentos.status, "agendado"),
          ),
        );

      const temConflito = agendamentosExistentes.some((agendamento) => {
        const inicioExistente = dayjs(agendamento.dataHora);
        const fimExistente = inicioExistente.add(
          agendamento.duracaoMinutos,
          "minute",
        );
        return dataInicio.isBefore(fimExistente) && dataFim.isAfter(inicioExistente);
      });

      if (temConflito) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Horário não disponível - conflita com outro agendamento",
        });
      }

      const diaSemanaNumero = dataInicio.day();
      const intervalos = await db.query.intervalosTrabalho.findMany({
        where: and(
          eq(intervalosTrabalho.userId, userId),
          eq(intervalosTrabalho.diaSemana, diaSemanaNumero),
          eq(intervalosTrabalho.ativo, true),
        ),
      });

      if (intervalos.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fora do horário de funcionamento (dia fechado).",
        });
      }

      const inicioAgendamentoMinutos =
        dataInicio.hour() * 60 + dataInicio.minute();
      const fimAgendamentoMinutos = dataFim.hour() * 60 + dataFim.minute();

      const estaDentroDoHorario = intervalos.some((intervalo) => {
        const [horaInicio, minutoInicio] = intervalo.horaInicio
          .split(":")
          .map(Number);
        if (horaInicio === undefined || minutoInicio === undefined) return false;
        const [horaFim, minutoFim] = intervalo.horaFim.split(":").map(Number);
        if (horaFim === undefined || minutoFim === undefined) return false;

        const inicioIntervaloMinutos = horaInicio * 60 + minutoInicio;
        const fimIntervaloMinutos = horaFim * 60 + minutoFim;

        return (
          inicioAgendamentoMinutos >= inicioIntervaloMinutos &&
          fimAgendamentoMinutos <= fimIntervaloMinutos
        );
      });

      if (!estaDentroDoHorario) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fora do horário de funcionamento.",
        });
      }

      const novoAgendamento = await db
        .insert(agendamentos)
        .values({
          userId,
          clienteId: input.clienteId,
          servicoId: servicoSelecionado.id,
          dataHora,
          servico: input.servico,
          status: input.status,
          duracaoMinutos,
          valorCobrado,
          observacoes: input.observacoes,
        })
        .returning();

      return novoAgendamento[0]!;
    }),

  getServicos: publicProcedure.query(async () => {
    try {
      const configuracao = await db.query.configuracoes.findFirst();
      if (!configuracao) {
        return [];
      }

      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, configuracao.userId),
        orderBy: (servicos, { asc }) => [asc(servicos.nome)],
      });

      const servicosFormatados = servicosUsuario.map((servico) => {
        return {
          nome: servico.nome,
          preco: Number.parseFloat(servico.preco?.toString() ?? "0"),
          duracaoMinutos: servico.duracao,
        };
      });

      return servicosFormatados;
    } catch {
      return [];
    }
  }),

  getHorariosDisponiveis: publicProcedure
    .input(
      z.object({
        data: z.string(),
        servico: z.string(),
      }),
    )
    .query(async ({ input }) => {
      if (!input.data || !input.servico) {
        return { horarios: [], erro: null };
      }

      const data = dayjs(input.data);
      const diaSemanaNumero = getDiaSemanaNumero(data.toDate());

      if (data.isBefore(dayjs(), "day")) {
        return {
          horarios: [],
          erro: "Não é possível agendar para datas passadas",
        };
      }

      const configuracao = await db.query.configuracoes.findFirst();
      if (!configuracao) {
        return { horarios: [], erro: "Configuração não encontrada" };
      }

      const intervalos = await db.query.intervalosTrabalho.findMany({
        where: and(
          eq(intervalosTrabalho.diaSemana, diaSemanaNumero),
          eq(intervalosTrabalho.ativo, true),
        ),
        orderBy: [intervalosTrabalho.horaInicio],
      });

      if (intervalos.length === 0) {
        return { horarios: [], erro: "Estabelecimento fechado neste dia" };
      }

      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, configuracao.userId),
      });

      const servicoSelecionado = servicosUsuario.find(
        (s) => s.nome === input.servico,
      );
      if (!servicoSelecionado) {
        return { horarios: [], erro: "Serviço não encontrado" };
      }

      const duracaoServico = servicoSelecionado.duracao ?? 30;

      const horariosDisponiveis = intervalos.flatMap((intervalo) =>
        gerarHorarios(intervalo.horaInicio, intervalo.horaFim, duracaoServico),
      );

      const start = data.startOf("day").toDate();
      const end = data.endOf("day").toDate();

      const agendamentosExistentes = await db
        .select({
          dataHora: agendamentos.dataHora,
          duracaoMinutos: agendamentos.duracaoMinutos,
        })
        .from(agendamentos)
        .where(
          and(
            gte(agendamentos.dataHora, start),
            lte(agendamentos.dataHora, end),
            eq(agendamentos.status, "agendado"),
          ),
        );

      const horariosLivres = horariosDisponiveis.filter((horario) => {
        const dataHorario = dayjs(`${input.data}T${horario}`);
        const fimNovoAgendamento = dataHorario.add(duracaoServico, "minute");

        return !agendamentosExistentes.some((agendamento) => {
          const inicioAgendamento = dayjs(agendamento.dataHora);
          const fimAgendamento = inicioAgendamento.add(
            agendamento.duracaoMinutos ?? 30,
            "minute",
          );
          return (
            dataHorario.isBefore(fimAgendamento) &&
            fimNovoAgendamento.isAfter(inicioAgendamento)
          );
        });
      });

      if (data.isSame(dayjs(), "day")) {
        const agora = dayjs();
        const horariosValidos = horariosLivres.filter((horario) => {
          const dataHorario = dayjs(`${input.data}T${horario}`);
          return dataHorario.isAfter(agora.add(30, "minute"));
        });
        return { horarios: horariosValidos, erro: null };
      }

      return { horarios: horariosLivres, erro: null };
    }),

  criarAgendamentoPublico: publicProcedure
    .input(
      z.object({
        nome: z.string(),
        telefone: z.string(),
        email: z.string().optional(),
        data: z.string(),
        horario: z.string().min(1, "Horário é obrigatório"),
        servico: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.horario || input.horario.trim() === "") {
        throw new Error("Horário não pode estar vazio");
      }

      let cliente = await db.query.clientes.findFirst({
        where: eq(clientes.telefone, input.telefone),
      });

      if (!cliente) {
        const novoCliente = await db
          .insert(clientes)
          .values({
            nome: input.nome,
            telefone: input.telefone,
            email: input.email,
          })
          .returning();
        cliente = novoCliente[0]!;
      }

      const dataHora = dayjs(`${input.data}T${input.horario}`);
      const configuracao = await db.query.configuracoes.findFirst();

      if (!configuracao) {
        throw new Error("Configuração não encontrada");
      }

      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, configuracao.userId),
      });

      const servicoSelecionado = servicosUsuario.find(
        (s) => s.nome === input.servico,
      );

      if (!servicoSelecionado) {
        throw new Error("Serviço não encontrado");
      }

      const duracaoMinutos = servicoSelecionado.duracao ?? 30;
      const valorCobrado = Number.parseFloat(
        servicoSelecionado.preco?.toString() ?? "0",
      );
      const fimAgendamento = dataHora.add(duracaoMinutos, "minute");

      const start = dataHora.startOf("day").toDate();
      const end = dataHora.endOf("day").toDate();

      const conflitos = await db
        .select()
        .from(agendamentos)
        .where(
          and(
            gte(agendamentos.dataHora, start),
            lte(agendamentos.dataHora, end),
            eq(agendamentos.status, "agendado"),
          ),
        );

      const temConflito = conflitos.some((agendamento) => {
        const inicioExistente = dayjs(agendamento.dataHora);
        const fimExistente = inicioExistente.add(
          agendamento.duracaoMinutos || 30,
          "minute",
        );

        return (
          dataHora.isBefore(fimExistente) &&
          fimAgendamento.isAfter(inicioExistente)
        );
      });

      if (temConflito) {
        throw new Error("Horário não disponível");
      }

      const colunasReais = await obterColunasReais("agendamentos");

      // Interface tipada para os valores do agendamento
      interface AgendamentoValues {
        clienteId: number;
        dataHora: Date;
        servico: string;
        status: string;
        userId?: number;
        servicoId?: number;
        duracaoMinutos?: number;
        valorCobrado?: string;
      }

      const valoresBase: AgendamentoValues = {
        clienteId: cliente.id,
        dataHora: dataHora.toDate(),
        servico: input.servico,
        status: "agendado",
      };

      if (colunasReais.includes("user_id") && configuracao.userId) {
        valoresBase.userId = configuracao.userId;
      }

      if (colunasReais.includes("servico_id")) {
        valoresBase.servicoId = servicoSelecionado.id;
      }

      if (colunasReais.includes("duracao_minutos")) {
        valoresBase.duracaoMinutos = duracaoMinutos;
      }

      if (colunasReais.includes("valor_cobrado") && valorCobrado > 0) {
        valoresBase.valorCobrado = valorCobrado.toString();
      }

      const result = await db
        .insert(agendamentos)
        .values(valoresBase)
        .returning();

      const agendamento = result[0]!;

      let whatsappEnviado = false;
      let whatsappError = null;

      try {
        const whatsappAtivo = configuracao.whatsappAgentEnabled;

        if (!whatsappAtivo) {
          whatsappError = "WhatsApp inativo nas configurações";
        } else {
          const dataFormatada = dataHora.format("DD/MM/YYYY");
          const mensagemConfirmacao = `🎉 *Agendamento Confirmado!*

Olá, ${input.nome}! Seu agendamento foi realizado com sucesso.

📋 *Detalhes do Agendamento:*
• *Serviço:* ${input.servico}
• *Data:* ${dataFormatada}
• *Horário:* ${input.horario}
• *Valor:* R$ ${valorCobrado.toFixed(2)}

📍 *Local:* ${configuracao.endereco ?? "Endereço não informado"}
📞 *Contato:* ${configuracao.telefone ?? "Telefone não informado"}

⏰ *Importante:* Chegue com 10 minutos de antecedência.

Se precisar reagendar ou cancelar, responda esta mensagem que nosso assistente virtual te ajudará!

Obrigado pela preferência! 💈✨`;

          const resultado = await enviarMensagemWhatsApp(
            input.telefone,
            mensagemConfirmacao,
          );

          if (resultado.success) {
            whatsappEnviado = true;
          } else {
            whatsappError = resultado.error ?? "Erro desconhecido no envio";
          }
        }
      } catch (error) {
        console.error("Erro detalhado no envio do WhatsApp:", error);
        return {
          ...agendamento,
          whatsappEnviado: false,
          whatsappError:
            error instanceof Error
              ? error.message
              : "Erro desconhecido no envio do WhatsApp",
        };
      }

      return {
        ...agendamento,
        whatsappEnviado,
        whatsappError,
      };
    }),

  criarSolicitacaoAgendamento: publicProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        telefone: z
          .string()
          .min(10, "Telefone deve ter pelo menos 10 dígitos"),
        dataDesejada: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      let cliente = await db.query.clientes.findFirst({
        where: eq(clientes.telefone, input.telefone),
      });

      let isClienteExistente = false;

      if (!cliente) {
        const novoCliente = await db
          .insert(clientes)
          .values({
            nome: input.nome,
            telefone: input.telefone,
            email: null,
          })
          .returning();
        cliente = novoCliente[0]!;
      } else {
        isClienteExistente = true;
        if (cliente.nome !== input.nome) {
          await db
            .update(clientes)
            .set({ nome: input.nome, updatedAt: new Date() })
            .where(eq(clientes.id, cliente.id));
        }
      }

      return {
        success: true,
        clienteId: cliente.id,
        clienteExistente: isClienteExistente,
        message: isClienteExistente
          ? "Solicitação registrada para cliente existente"
          : "Solicitação de agendamento recebida com sucesso",
      };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = parseInt(ctx.user.id, 10);
      if (isNaN(userId)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "ID de usuário inválido.",
        });
      }
      const { id, status } = input;

      const agendamento = await db.query.agendamentos.findFirst({
        where: and(
          eq(agendamentos.id, id),
          eq(agendamentos.userId, userId),
        ),
      });

      if (!agendamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agendamento não encontrado",
        });
      }

      const agendamentoAtualizado = await db
        .update(agendamentos)
        .set({ status })
        .where(eq(agendamentos.id, id))
        .returning();

      return agendamentoAtualizado[0];
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = parseInt(ctx.user.id, 10);
      if (isNaN(userId)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "ID de usuário inválido.",
        });
      }
      const { id } = input;

      const agendamento = await db.query.agendamentos.findFirst({
        where: and(
          eq(agendamentos.id, id),
          eq(agendamentos.userId, userId),
        ),
      });

      if (!agendamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agendamento não encontrado",
        });
      }

      await db
        .delete(agendamentos)
        .where(eq(agendamentos.id, id));

      return { success: true };
    }),

  cancelar: protectedProcedure
    .input(
      z.object({
        agendamentoId: z.string(),
        motivo: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = parseInt(ctx.user.id, 10);
      if (isNaN(userId)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "ID de usuário inválido.",
        });
      }
      const { agendamentoId, motivo } = input;

      const agendamentoAtual = await db.query.agendamentos.findFirst({
        where: and(
          eq(agendamentos.id, agendamentoId),
          eq(agendamentos.userId, userId),
        ),
        with: {
          cliente: true,
        },
      });

      if (!agendamentoAtual) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agendamento não encontrado",
        });
      }

      if (agendamentoAtual.status === "cancelado") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este agendamento já está cancelado.",
        });
      }

      await db
        .update(agendamentos)
        .set({
          status: "cancelado",
          observacoes: `Cancelado pelo usuário. Motivo: ${motivo ?? "Não especificado."
            }`,
        })
        .where(eq(agendamentos.id, agendamentoId));

      if (agendamentoAtual.cliente?.telefone) {
        const mensagem = `Olá ${agendamentoAtual.cliente.nome
          }, seu agendamento para ${agendamentoAtual.servico
          } no dia ${dayjs(agendamentoAtual.dataHora).format(
            "DD/MM/YYYY HH:mm",
          )} foi cancelado. `;
        try {
          await enviarMensagemWhatsApp(
            agendamentoAtual.cliente.telefone,
            mensagem,
          );
        } catch (e) {
          console.error(
            "Falha ao enviar notificação de cancelamento via WhatsApp",
            e,
          );
        }
      }

      return { success: true, message: "Agendamento cancelado com sucesso." };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        clienteId: z.number(),
        data: z.string(),
        horario: z.string(),
        servico: z.string(),
        status: z.enum(["agendado", "cancelado", "concluido"]),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = parseInt(ctx.user.id, 10);
      if (isNaN(userId)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "ID de usuário inválido.",
        });
      }
      const dataHora = dayjs(`${input.data}T${input.horario}`).toDate();

      const agendamentoOriginal = await db.query.agendamentos.findFirst({
        where: and(
          eq(agendamentos.id, input.id),
          eq(agendamentos.userId, userId),
        ),
      });
      if (!agendamentoOriginal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agendamento a ser atualizado não foi encontrado",
        });
      }

      const servicoSelecionado = await db.query.servicos.findFirst({
        where: and(
          eq(servicos.userId, userId),
          eq(servicos.nome, input.servico),
          eq(servicos.ativo, true),
        ),
      });
      if (!servicoSelecionado) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Serviço "${input.servico}" não encontrado ou inativo`,
        });
      }

      const agendamentoAtualizado = await db
        .update(agendamentos)
        .set({
          clienteId: input.clienteId,
          servicoId: servicoSelecionado.id,
          dataHora,
          servico: input.servico,
          status: input.status,
          duracaoMinutos: servicoSelecionado.duracao,
          valorCobrado: servicoSelecionado.preco,
          observacoes: input.observacoes,
        })
        .where(eq(agendamentos.id, input.id))
        .returning();

      return agendamentoAtualizado[0];
    }),

  getCortesDoMes: publicProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

      const cortes = await db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
          cliente: {
            nome: clientes.nome,
          },
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .where(
          and(
            gte(agendamentos.dataHora, startDate),
            lte(agendamentos.dataHora, endDate),
            sql`${agendamentos.servico} ILIKE '%corte%'`,
            eq(agendamentos.status, "concluido"),
          ),
        )
        .orderBy(desc(agendamentos.dataHora));
      console.log("TRPC INPUT:", input);
      console.log("Start:", startDate.toISOString());
      console.log("End:", endDate.toISOString());

      return cortes;
    }),

  getAgendamentosDoMes: publicProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

      const agendamentosDoMes = await db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
          cliente: {
            nome: clientes.nome,
          },
        })
        .from(agendamentos)
        .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
        .where(
          and(
            gte(agendamentos.dataHora, startDate),
            lte(agendamentos.dataHora, endDate),
          ),
        )
        .orderBy(agendamentos.dataHora);

      return agendamentosDoMes;
    }),

  getAgendamentosRecentes: publicProcedure.query(async () => {
    const agora = new Date();
    const proximosSeteDias = dayjs().add(7, "days").toDate();

    const agendamentosRecentes = await db
      .select({
        id: agendamentos.id,
        dataHora: agendamentos.dataHora,
        servico: agendamentos.servico,
        status: agendamentos.status,
        cliente: {
          nome: clientes.nome,
        },
      })
      .from(agendamentos)
      .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
      .where(
        and(
          gte(agendamentos.dataHora, agora),
          lte(agendamentos.dataHora, proximosSeteDias),
          eq(agendamentos.status, "agendado"),
        ),
      )
      .orderBy(agendamentos.dataHora)
      .limit(5);

    return agendamentosRecentes;
  }),

  getHistoricoPorCliente: publicProcedure
    .input(z.object({ clienteId: z.string() }))
    .query(async ({ input }) => {
      const clienteIdNum = parseInt(input.clienteId, 10);
      if (isNaN(clienteIdNum)) {
        throw new Error("ID de cliente inválido");
      }
      const historico = await db
        .select({
          id: agendamentos.id,
          dataHora: agendamentos.dataHora,
          servico: agendamentos.servico,
          status: agendamentos.status,
        })
        .from(agendamentos)
        .where(eq(agendamentos.clienteId, clienteIdNum))
        .orderBy(desc(agendamentos.dataHora));

      return historico;
    }),

  getFaturamentoPorCliente: publicProcedure.query(async () => {
    const resultado = await db
      .select({
        clienteId: agendamentos.clienteId,
        nome: clientes.nome,
        quantidade: sql<number>`COUNT(*)`,
        total: sql<number>`SUM(${agendamentos.valorCobrado})`,
      })
      .from(agendamentos)
      .innerJoin(clientes, eq(agendamentos.clienteId, clientes.id))
      .where(eq(agendamentos.status, "concluido"))
      .groupBy(agendamentos.clienteId, clientes.nome)
      .orderBy(desc(sql<number>`SUM(${agendamentos.valorCobrado})`));

    return resultado;
  }),

  getHorariosDisponiveisPorData: publicProcedure
    .input(
      z.object({
        data: z.string(),
        servico: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const data = dayjs(input.data);
      const diaSemanaNumero = getDiaSemanaNumero(data.toDate());

      const configuracao = await db.query.configuracoes.findFirst();
      if (!configuracao) {
        return {
          horarios: [],
          intervalos: [],
          erro: "Configuração não encontrada",
        };
      }

      const intervalos = await db.query.intervalosTrabalho.findMany({
        where: and(
          eq(intervalosTrabalho.diaSemana, diaSemanaNumero),
          eq(intervalosTrabalho.ativo, true),
        ),
        orderBy: [intervalosTrabalho.horaInicio],
      });

      if (intervalos.length === 0) {
        return {
          horarios: [],
          intervalos: [],
          erro: "Estabelecimento fechado neste dia",
        };
      }
      const intervalosInfo = intervalos.map((i) => ({
        inicio: i.horaInicio,
        fim: i.horaFim,
      }));

      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, configuracao.userId),
      });

      const servicoSelecionado = servicosUsuario.find(
        (s) => s.nome === input.servico,
      );
      if (!servicoSelecionado) {
        return { horarios: [], intervalos: [], erro: "Serviço não encontrado" };
      }
      const duracaoServico = servicoSelecionado.duracao ?? 30;

      const horariosDisponiveis: string[] = [];
      for (const intervalo of intervalosInfo) {
        const [horaInicio, minutoInicio] = intervalo.inicio
          .split(":")
          .map(Number);
        const [horaFim, minutoFim] = intervalo.fim.split(":").map(Number);
        if (
          horaInicio === undefined ||
          minutoInicio === undefined ||
          horaFim === undefined ||
          minutoFim === undefined
        ) {
          continue;
        }
        const inicioMinutos = horaInicio * 60 + minutoInicio;
        const fimMinutos = horaFim * 60 + minutoFim;

        for (
          let minutos = inicioMinutos;
          minutos + duracaoServico <= fimMinutos;
          minutos += 10
        ) {
          const hora = Math.floor(minutos / 60);
          const minuto = minutos % 60;
          horariosDisponiveis.push(
            `${hora.toString().padStart(2, "0")}:${minuto
              .toString()
              .padStart(2, "0")}`,
          );
        }
      }

      const start = data.startOf("day").toDate();
      const end = data.endOf("day").toDate();
      const agendamentosExistentes = await db
        .select({
          dataHora: agendamentos.dataHora,
          duracaoMinutos: agendamentos.duracaoMinutos,
        })
        .from(agendamentos)
        .where(
          and(
            gte(agendamentos.dataHora, start),
            lte(agendamentos.dataHora, end),
            eq(agendamentos.status, "agendado"),
          ),
        );

      const horariosComStatus = horariosDisponiveis.map((horario) => {
        const dataHorario = dayjs(`${input.data}T${horario}`);
        const fimNovoAgendamento = dataHorario.add(duracaoServico, "minute");
        const temConflito = agendamentosExistentes.some((agendamento) => {
          const inicioAgendamento = dayjs(agendamento.dataHora);
          const fimAgendamento = inicioAgendamento.add(
            agendamento.duracaoMinutos ?? 30,
            "minute",
          );
          return (
            dataHorario.isBefore(fimAgendamento) &&
            fimNovoAgendamento.isAfter(inicioAgendamento)
          );
        });
        return {
          horario,
          disponivel: !temConflito,
        };
      });

      return {
        horarios: horariosComStatus,
        intervalos: intervalosInfo,
        erro: null,
      };
    }),

  verificarConflito: publicProcedure
    .input(
      z.object({
        data: z.string(),
        horario: z.string(),
        servico: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { data, horario, servico } = input;

      const horarioRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!horarioRegex.test(horario)) {
        return { temConflito: true, motivo: "Formato de horário inválido" };
      }

      const config = await db.query.configuracoes.findFirst();
      if (!config) {
        return {
          temConflito: true,
          motivo: "Configurações não encontradas",
        };
      }

      const servicosUsuario = await db.query.servicos.findMany({
        where: eq(servicos.userId, config.userId),
      });
      const servicoInfo = servicosUsuario.find((s) => s.nome === servico);
      const duracaoMinutos = servicoInfo?.duracao ?? 30;

      const dataObj = dayjs(data);
      const diaSemanaNumero = getDiaSemanaNumero(dataObj.toDate());

      const [horas, minutos] = horario.split(":").map(Number);
      if (horas === undefined || minutos === undefined) {
        return { temConflito: true, motivo: "Formato de horário inválido" };
      }
      const horarioMinutos = horas * 60 + minutos;
      const horarioFimMinutos = horarioMinutos + duracaoMinutos;

      const intervalos = await db.query.intervalosTrabalho.findMany({
        where: and(
          eq(intervalosTrabalho.diaSemana, diaSemanaNumero),
          eq(intervalosTrabalho.ativo, true),
        ),
      });

      if (intervalos.length === 0) {
        return {
          temConflito: true,
          motivo: "Estabelecimento fechado neste dia",
        };
      }

      const estaDentroDoHorario = intervalos.some((intervalo) => {
        const [horaInicio, minutoInicio] = intervalo.horaInicio
          .split(":")
          .map(Number);
        const [horaFim, minutoFim] = intervalo.horaFim.split(":").map(Number);
        if (
          horaInicio === undefined ||
          minutoInicio === undefined ||
          horaFim === undefined ||
          minutoFim === undefined
        ) {
          return false;
        }
        const inicioMinutos = horaInicio * 60 + minutoInicio;
        const fimMinutos = horaFim * 60 + minutoFim;
        return (
          horarioMinutos >= inicioMinutos && horarioFimMinutos <= fimMinutos
        );
      });

      if (!estaDentroDoHorario) {
        return {
          temConflito: true,
          motivo: "Horário fora do período de funcionamento.",
        };
      }

      const start = dataObj.startOf("day").toDate();
      const end = dataObj.endOf("day").toDate();
      const agendamentosExistentes = await db
        .select({
          dataHora: agendamentos.dataHora,
          duracaoMinutos: agendamentos.duracaoMinutos,
        })
        .from(agendamentos)
        .where(
          and(
            gte(agendamentos.dataHora, start),
            lte(agendamentos.dataHora, end),
            eq(agendamentos.status, "agendado"),
          ),
        );

      for (const agendamento of agendamentosExistentes) {
        const inicioAgendamento = dayjs(agendamento.dataHora);
        const horasExistente = inicioAgendamento.hour();
        const minutosExistente = inicioAgendamento.minute();
        const horarioExistenteMinutos =
          horasExistente * 60 + minutosExistente;
        const horarioExistenteFimMinutos =
          horarioExistenteMinutos + (agendamento.duracaoMinutos ?? 30);

        const temSobreposicao =
          (horarioMinutos >= horarioExistenteMinutos &&
            horarioMinutos < horarioExistenteFimMinutos) ||
          (horarioFimMinutos > horarioExistenteMinutos &&
            horarioFimMinutos <= horarioExistenteFimMinutos) ||
          (horarioMinutos <= horarioExistenteMinutos &&
            horarioFimMinutos >= horarioExistenteFimMinutos);

        if (temSobreposicao) {
          return {
            temConflito: true,
            motivo: "Horário já ocupado por outro agendamento",
          };
        }
      }

      return { temConflito: false };
    }),
});