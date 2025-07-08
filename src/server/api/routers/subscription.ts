import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";
import { db } from "@/server/db";
import { subscriptions, plans, payments, agendamentos } from "@/server/db/schema";
import dayjs from "dayjs";

export const subscriptionRouter = createTRPCRouter({
    // Obter assinatura atual do usuário
    getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.user.id;

        const subscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.status, "active")
            ),
            with: {
                plan: true,
            },
            orderBy: [desc(subscriptions.createdAt)],
        });

        if (!subscription) {
            return null;
        }

        return {
            id: subscription.id,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: subscription.autoRenew,
            planType: subscription.plan.type,
            planName: subscription.plan.name,
            planPrice: Number(subscription.plan.price),
            planFeatures: subscription.plan.features,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripeCustomerId: subscription.stripeCustomerId,
        };
    }),

    // Criar nova assinatura
    create: protectedProcedure
        .input(
            z.object({
                planType: z.enum(["starter", "pro"]),
                planName: z.string(),
                price: z.number(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            // Verificar se já existe uma assinatura ativa
            const existingSubscription = await db.query.subscriptions.findFirst({
                where: and(
                    eq(subscriptions.userId, userId),
                    eq(subscriptions.status, "active")
                ),
            });

            if (existingSubscription) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Usuário já possui uma assinatura ativa",
                });
            }

            // Buscar ou criar plano
            let plan = await db.query.plans.findFirst({
                where: eq(plans.type, input.planType),
            });

            if (!plan) {
                // Criar plano se não existir
                const planFeatures = input.planType === "starter"
                    ? [
                        "Até 30 agendamentos por mês",
                        "Análise de desempenho básica",
                        "Métricas básicas",
                        "Agendamentos recentes",
                        "Gestão de clientes",
                        "Serviços ilimitados"
                    ]
                    : [
                        "Agendamentos ilimitados",
                        "Integração WhatsApp",
                        "Análises aprofundadas",
                        "Métricas de crescimento",
                        "Relatórios avançados",
                        "Configuração de tema",
                        "Gerenciamento de usuários",
                        "Usuários ilimitados"
                    ];

                const newPlan = await db
                    .insert(plans)
                    .values({
                        name: input.planName,
                        type: input.planType,
                        price: input.price.toString(),
                        features: planFeatures,
                    })
                    .returning();

                plan = newPlan[0]!;
            }

            // Criar assinatura
            const startDate = dayjs().toDate();
            const endDate = dayjs().add(1, "month").toDate();

            const newSubscription = await db
                .insert(subscriptions)
                .values({
                    userId,
                    planId: plan.id,
                    status: "active",
                    startDate,
                    endDate,
                    autoRenew: true,
                })
                .returning();

            // Integração com Mercado Pago seria implementada aqui
            // Por enquanto, vamos simular uma URL de pagamento
            const paymentUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock-${newSubscription[0]?.id}`;

            return {
                subscriptionId: newSubscription[0]?.id,
                paymentUrl,
                message: "Assinatura criada com sucesso",
            };
        }),

    // Cancelar assinatura
    cancel: protectedProcedure
        .input(z.object({ subscriptionId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            const subscription = await db.query.subscriptions.findFirst({
                where: and(
                    eq(subscriptions.id, input.subscriptionId),
                    eq(subscriptions.userId, userId)
                ),
            });

            if (!subscription) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Assinatura não encontrada",
                });
            }

            await db
                .update(subscriptions)
                .set({
                    status: "cancelled",
                    autoRenew: false,
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, input.subscriptionId));

            return { success: true, message: "Assinatura cancelada com sucesso" };
        }),

    // Listar histórico de assinaturas
    getHistory: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.user.id;

        const subscriptionHistory = await db.query.subscriptions.findMany({
            where: eq(subscriptions.userId, userId),
            with: {
                plan: true,
                payments: {
                    orderBy: [desc(payments.createdAt)],
                },
            },
            orderBy: [desc(subscriptions.createdAt)],
        });

        return subscriptionHistory.map((sub) => ({
            id: sub.id,
            status: sub.status,
            startDate: sub.startDate,
            endDate: sub.endDate,
            autoRenew: sub.autoRenew,
            planName: sub.plan.name,
            planType: sub.plan.type,
            planPrice: Number(sub.plan.price),
            paymentsCount: sub.payments.length,
            createdAt: sub.createdAt,
        }));
    }),

    // Verificar limites do plano atual
    checkLimits: protectedProcedure
        .input(z.object({
            feature: z.enum(['whatsappIntegration', 'advancedAnalytics', 'customTheme', 'unlimitedUsers', 'unlimitedBookings'])
        }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.user.id

            // Buscar assinatura ativa
            const subscription = await ctx.db.query.subscriptions.findFirst({
                where: and(
                    eq(subscriptions.userId, userId),
                    eq(subscriptions.status, 'active')
                ),
                with: {
                    plan: true
                }
            })

            if (!subscription) {
                return { hasAccess: false, reason: 'Nenhuma assinatura ativa encontrada' }
            }

            // Tipo as features como objeto conhecido
            const features = subscription.plan.features as Record<string, boolean>

            // Verificar feature específica
            switch (input.feature) {
                case 'whatsappIntegration':
                    return {
                        hasAccess: features.whatsappIntegration ?? false,
                        reason: features.whatsappIntegration ? null : 'Recurso não disponível no seu plano'
                    }
                case 'advancedAnalytics':
                    return {
                        hasAccess: features.advancedAnalytics ?? false,
                        reason: features.advancedAnalytics ? null : 'Recurso não disponível no seu plano'
                    }
                case 'customTheme':
                    return {
                        hasAccess: features.customTheme ?? false,
                        reason: features.customTheme ? null : 'Recurso não disponível no seu plano'
                    }
                case 'unlimitedUsers':
                    return {
                        hasAccess: features.unlimitedUsers ?? false,
                        reason: features.unlimitedUsers ? null : 'Recurso não disponível no seu plano'
                    }
                case 'unlimitedBookings':
                    return {
                        hasAccess: features.unlimitedBookings ?? false,
                        reason: features.unlimitedBookings ? null : 'Recurso não disponível no seu plano'
                    }
                default:
                    return { hasAccess: false, reason: 'Feature não reconhecida' }
            }
        }),

    // Verificar limite de agendamentos mensais
    checkMonthlyBookings: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.user.id

            try {
                // Buscar assinatura ativa
                const subscription = await ctx.db.query.subscriptions.findFirst({
                    where: and(
                        eq(subscriptions.userId, userId),
                        eq(subscriptions.status, 'active')
                    ),
                    with: {
                        plan: true
                    }
                })

                if (!subscription) {
                    return {
                        hasAccess: false,
                        currentCount: 0,
                        limit: 0,
                        reason: 'Nenhuma assinatura ativa encontrada'
                    }
                }

                // Como limits foi removido, usar valores padrão baseados no tipo do plano
                const monthlyBookings = subscription.plan.type === 'pro' ? -1 : 30

                // Se tem agendamentos ilimitados, retornar acesso
                if (monthlyBookings === -1) {
                    return { hasAccess: true, currentCount: 0, limit: -1, reason: null }
                }

                // Calcular início e fim do mês atual
                const now = new Date()
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

                // Contar agendamentos do mês atual
                const [result] = await ctx.db
                    .select({ count: count() })
                    .from(agendamentos)
                    .where(
                        and(
                            eq(agendamentos.userId, userId),
                            gte(agendamentos.dataHora, startOfMonth),
                            lte(agendamentos.dataHora, endOfMonth)
                        )
                    )

                const currentCount = result?.count ?? 0
                const hasAccess = currentCount < monthlyBookings

                return {
                    hasAccess,
                    currentCount,
                    limit: monthlyBookings,
                    reason: hasAccess ? null : 'Limite de agendamentos mensais atingido'
                }

            } catch (error) {
                console.error('Erro ao verificar limite de agendamentos:', error)
                return {
                    hasAccess: false,
                    currentCount: 0,
                    limit: 0,
                    reason: 'Erro ao verificar limite de agendamentos'
                }
            }
        }),
}); 