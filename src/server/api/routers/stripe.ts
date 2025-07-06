import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
});

export const stripeRouter = createTRPCRouter({
    // Criar sessão de checkout
    createCheckoutSession: protectedProcedure
        .input(z.object({
            planId: z.number(),
            planName: z.string(),
            amount: z.number(),
            description: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            try {
                // Criar sessão de checkout do Stripe
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [
                        {
                            price_data: {
                                currency: 'brl',
                                product_data: {
                                    name: input.planName,
                                    description: input.description || `Assinatura do plano ${input.planName}`,
                                },
                                unit_amount: Math.round(input.amount * 100), // Stripe usa centavos
                                recurring: {
                                    interval: 'month',
                                },
                            },
                            quantity: 1,
                        },
                    ],
                    mode: 'subscription',
                    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/configuracoes?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/configuracoes?payment=cancelled`,
                    metadata: {
                        userId: userId.toString(),
                        planId: input.planId.toString(),
                    },
                    customer_email: ctx.user.email,
                });

                return {
                    success: true,
                    sessionId: session.id,
                    url: session.url,
                };
            } catch (error) {
                console.error('Erro ao criar sessão do Stripe:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao criar sessão de pagamento',
                });
            }
        }),

    // Verificar status da sessão
    getSessionStatus: protectedProcedure
        .input(z.object({
            sessionId: z.string(),
        }))
        .query(async ({ input }) => {
            try {
                const session = await stripe.checkout.sessions.retrieve(input.sessionId);

                return {
                    status: session.status,
                    paymentStatus: session.payment_status,
                    customerEmail: session.customer_email,
                    subscriptionId: session.subscription as string,
                };
            } catch (error) {
                console.error('Erro ao verificar sessão:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao verificar status da sessão',
                });
            }
        }),

    // Cancelar assinatura
    cancelSubscription: protectedProcedure
        .input(z.object({
            subscriptionId: z.string(),
        }))
        .mutation(async ({ input }) => {
            try {
                const subscription = await stripe.subscriptions.update(input.subscriptionId, {
                    cancel_at_period_end: true,
                });

                return {
                    success: true,
                    cancelAt: subscription.cancel_at,
                };
            } catch (error) {
                console.error('Erro ao cancelar assinatura:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao cancelar assinatura',
                });
            }
        }),

    // Obter detalhes da assinatura
    getSubscriptionDetails: protectedProcedure
        .input(z.object({
            subscriptionId: z.string(),
        }))
        .query(async ({ input }) => {
            try {
                const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);

                return {
                    id: subscription.id,
                    status: subscription.status,
                    currentPeriodStart: subscription.current_period_start,
                    currentPeriodEnd: subscription.current_period_end,
                    cancelAt: subscription.cancel_at,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                };
            } catch (error) {
                console.error('Erro ao obter detalhes da assinatura:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Erro ao obter detalhes da assinatura',
                });
            }
        }),

    // Testar conexão com Stripe
    testConnection: protectedProcedure
        .query(async () => {
            try {
                const account = await stripe.accounts.retrieve();

                return {
                    success: true,
                    data: {
                        id: account.id,
                        country: account.country,
                        currency: account.default_currency,
                        email: account.email,
                    },
                };
            } catch (error) {
                console.error('Erro ao testar conexão com Stripe:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Erro desconhecido',
                };
            }
        }),

    // Obter configurações públicas
    getPublicConfig: protectedProcedure
        .query(async () => {
            return {
                publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
                isConfigured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
            };
        }),
}); 