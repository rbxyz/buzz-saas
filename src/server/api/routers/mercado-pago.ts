import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Tipos para as respostas da API do Mercado Pago
interface MercadoPagoPaymentMethod {
    id: string;
    name: string;
    payment_type_id: string;
    status: string;
    thumbnail: string;
    secure_url: string;
}

interface MercadoPagoPaymentInfo {
    id: string;
    status: string;
    status_detail: string;
    transaction_amount: number;
    currency_id: string;
    payment_method_id: string;
    date_created: string;
    date_approved: string;
    external_reference: string;
}

interface MercadoPagoUserInfo {
    id: string;
    country_id: string;
    currency_id: string;
}

interface MercadoPagoPreference {
    id: string;
    init_point: string;
    sandbox_init_point: string;
}

// Função para fazer requisições à API do Mercado Pago
async function mercadoPagoRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    const baseUrl = "https://api.mercadopago.com";
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
    }

    return response.json();
}

export const mercadoPagoRouter = createTRPCRouter({
    // Testar conexão com Mercado Pago
    testConnection: protectedProcedure
        .query(async () => {
            try {
                const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

                if (!accessToken) {
                    return {
                        success: false,
                        error: "MERCADO_PAGO_ACCESS_TOKEN não configurado"
                    };
                }

                // Testar conexão com a API
                const userInfo = await mercadoPagoRequest("/v1/users/me") as MercadoPagoUserInfo;

                return {
                    success: true,
                    data: {
                        userId: userInfo.id,
                        countryId: userInfo.country_id,
                        currencyId: userInfo.currency_id,
                    }
                };
            } catch (error) {
                console.error("Erro ao testar conexão:", error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Erro desconhecido"
                };
            }
        }),

    // Criar preferência de pagamento
    createPaymentPreference: protectedProcedure
        .input(z.object({
            planId: z.number(),
            planName: z.string(),
            amount: z.number(),
            description: z.string().optional(),
            externalReference: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user.id;

            try {
                const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
                const webhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL;

                if (!accessToken) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "MERCADO_PAGO_ACCESS_TOKEN não configurado"
                    });
                }

                // Criar preferência de pagamento
                const preference = {
                    items: [
                        {
                            id: input.planId.toString(),
                            title: input.planName,
                            description: input.description ?? `Assinatura do plano ${input.planName}`,
                            quantity: 1,
                            unit_price: input.amount,
                        }
                    ],
                    external_reference: input.externalReference ?? `user_${userId}_plan_${input.planId}`,
                    back_urls: {
                        success: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/configuracoes?payment=success`,
                        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/configuracoes?payment=failure`,
                        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/configuracoes?payment=pending`,
                    },
                    auto_return: "approved",
                    notification_url: webhookUrl,
                };

                const result = await mercadoPagoRequest("/checkout/preferences", {
                    method: "POST",
                    body: JSON.stringify(preference),
                }) as MercadoPagoPreference;

                return {
                    success: true,
                    data: {
                        preferenceId: result.id,
                        initPoint: result.init_point,
                        sandboxInitPoint: result.sandbox_init_point,
                    }
                };
            } catch (error) {
                console.error("Erro ao criar preferência:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "Erro ao criar preferência de pagamento"
                });
            }
        }),

    // Obter informações de pagamento
    getPaymentInfo: protectedProcedure
        .input(z.object({
            paymentId: z.string(),
        }))
        .query(async ({ input }) => {
            try {
                const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

                if (!accessToken) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "MERCADO_PAGO_ACCESS_TOKEN não configurado"
                    });
                }

                // Buscar informações do pagamento
                const paymentInfo = await mercadoPagoRequest(`/v1/payments/${input.paymentId}`) as MercadoPagoPaymentInfo;

                return {
                    success: true,
                    data: {
                        id: paymentInfo.id,
                        status: paymentInfo.status,
                        statusDetail: paymentInfo.status_detail,
                        amount: paymentInfo.transaction_amount,
                        currency: paymentInfo.currency_id,
                        paymentMethod: paymentInfo.payment_method_id,
                        dateCreated: paymentInfo.date_created,
                        dateApproved: paymentInfo.date_approved,
                        externalReference: paymentInfo.external_reference,
                    }
                };
            } catch (error) {
                console.error("Erro ao buscar informações do pagamento:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "Erro ao buscar informações do pagamento"
                });
            }
        }),

    // Listar métodos de pagamento disponíveis
    getPaymentMethods: protectedProcedure
        .query(async () => {
            try {
                const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

                if (!accessToken) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "MERCADO_PAGO_ACCESS_TOKEN não configurado"
                    });
                }

                // Buscar métodos de pagamento
                const paymentMethods = await mercadoPagoRequest("/v1/payment_methods") as MercadoPagoPaymentMethod[];

                return paymentMethods.map((method: MercadoPagoPaymentMethod) => ({
                    id: method.id,
                    name: method.name,
                    paymentTypeId: method.payment_type_id,
                    status: method.status,
                    thumbnail: method.thumbnail,
                    secureUrl: method.secure_url,
                }));
            } catch (error) {
                console.error("Erro ao buscar métodos de pagamento:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "Erro ao buscar métodos de pagamento"
                });
            }
        }),

    // Obter configurações públicas (para frontend)
    getPublicConfig: protectedProcedure
        .query(async () => {
            return {
                publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY ?? "",
                isConfigured: !!(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_PUBLIC_KEY),
            };
        }),
}); 