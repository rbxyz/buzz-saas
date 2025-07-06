import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { payments, subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Interface para a notificação do Mercado Pago
interface MercadoPagoNotification {
    type: string;
    action: string;
    data: {
        id: string;
    };
}

// Interface para detalhes do pagamento
interface MercadoPagoPayment {
    id: string;
    status: string;
    status_detail: string;
    transaction_amount: number;
    currency_id: string;
    payment_method_id: string;
    date_created: string;
    date_approved: string | null;
    external_reference: string | null;
}

// Interface para detalhes da assinatura
interface MercadoPagoSubscription {
    id: string;
    status: string;
    external_reference: string | null;
    preapproval_plan_id: string;
    payer_id: number;
    reason: string;
    date_created: string;
    last_modified: string;
}

// Função para validar assinatura do webhook
function validateWebhookSignature(
    signature: string,
    requestId: string,
    body: string
): boolean {
    try {
        const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.warn("MERCADO_PAGO_WEBHOOK_SECRET não configurado");
            return true; // Em desenvolvimento, permitir sem validação
        }

        const parts = signature.split(",");
        const ts = parts.find(part => part.startsWith("ts="))?.replace("ts=", "");
        const hash = parts.find(part => part.startsWith("v1="))?.replace("v1=", "");

        if (!ts || !hash) {
            return false;
        }

        const manifest = `id:${requestId};request-id:${requestId};ts:${ts};`;
        const hmac = crypto.createHmac("sha256", webhookSecret);
        hmac.update(manifest);
        const sha = hmac.digest("hex");

        return sha === hash;
    } catch (error) {
        console.error("Erro ao validar assinatura:", error);
        return false;
    }
}

// Função para obter detalhes do pagamento via API do Mercado Pago
async function getPaymentDetails(paymentId: string, accessToken: string): Promise<MercadoPagoPayment> {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Erro ao obter detalhes do pagamento: ${response.status}`);
    }

    return await response.json() as MercadoPagoPayment;
}

export async function POST(req: NextRequest) {
    try {
        const signature = req.headers.get("x-signature");
        const requestId = req.headers.get("x-request-id");

        if (!signature || !requestId) {
            return NextResponse.json(
                { error: "Headers de segurança não encontrados" },
                { status: 400 }
            );
        }

        const body = await req.text();

        // Validar assinatura do webhook
        const isValid = validateWebhookSignature(signature, requestId, body);

        if (!isValid) {
            return NextResponse.json(
                { error: "Assinatura inválida" },
                { status: 401 }
            );
        }

        const data = JSON.parse(body) as MercadoPagoNotification;

        // Roteamento de notificações com base no tipo
        switch (data.type) {
            case "payment":
                await processPaymentNotification(data.data.id);
                break;
            case "preapproval":
                await processSubscriptionNotification(data.data.id);
                break;
            default:
                console.log(`Webhook de tipo [${data.type}] recebido, mas não processado.`);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Erro no webhook:", error);
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}

async function processPaymentNotification(paymentId: string) {
    try {
        const paymentInfo = await getPaymentInfo(paymentId);
        if (!paymentInfo) {
            console.error(`Informações do pagamento [${paymentId}] não encontradas.`);
            return;
        }

        // Se o pagamento for aprovado, tentamos ativar a assinatura
        if (paymentInfo.status === "approved") {
            await activateSubscription({ externalReference: paymentInfo.external_reference });
        }

    } catch (error) {
        console.error("Erro ao processar notificação de pagamento:", error);
    }
}

async function processSubscriptionNotification(subscriptionId: string) {
    try {
        const subscriptionInfo = await getSubscriptionInfo(subscriptionId);
        if (!subscriptionInfo) {
            console.error(`Informações da assinatura [${subscriptionId}] não encontradas.`);
            return;
        }

        if (subscriptionInfo.status === "authorized") {
            await activateSubscription({
                externalReference: subscriptionInfo.external_reference,
                mercadoPagoPlanId: subscriptionInfo.preapproval_plan_id
            });
        } else {
            // Aqui você pode adicionar lógica para outros status, como "paused", "cancelled"
            console.log(`Assinatura [${subscriptionId}] com status [${subscriptionInfo.status}]. Nenhuma ação executada.`);
        }
    } catch (error) {
        console.error("Erro ao processar notificação de assinatura:", error);
    }
}

async function getPaymentInfo(paymentId: string): Promise<MercadoPagoPayment | null> {
    try {
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");

        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`Erro na API do Mercado Pago ao buscar pagamento: ${response.status}`);
        }
        return await response.json() as MercadoPagoPayment;

    } catch (error) {
        console.error("Erro ao buscar informações do pagamento:", error);
        return null;
    }
}

async function getSubscriptionInfo(subscriptionId: string): Promise<MercadoPagoSubscription | null> {
    try {
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");

        const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`Erro na API do Mercado Pago ao buscar assinatura: ${response.status}`);
        }
        return await response.json() as MercadoPagoSubscription;

    } catch (error) {
        console.error("Erro ao buscar informações da assinatura:", error);
        return null;
    }
}

interface ActivateSubscriptionParams {
    externalReference: string | null;
    mercadoPagoPlanId?: string;
}

async function activateSubscription({ externalReference, mercadoPagoPlanId }: ActivateSubscriptionParams) {
    try {
        if (!externalReference) {
            console.error("External reference não fornecida para ativação.");
            return;
        }

        const parts = externalReference.split("_");
        if (parts.length < 2) {
            console.error("Formato de external reference inválido:", externalReference);
            return;
        }

        const userIdStr = parts[1];
        const userId = parseInt(userIdStr, 10);
        if (isNaN(userId)) {
            console.error("ID do usuário inválido na external reference:", externalReference);
            return;
        }

        let internalPlanId: number | undefined;

        if (mercadoPagoPlanId) {
            const internalPlan = await db.query.plans.findFirst({
                where: (plans, { eq }) => eq(plans.mercadoPagoPlanId, mercadoPagoPlanId),
            });
            if (!internalPlan) {
                console.error(`Plano com ID [${mercadoPagoPlanId}] do MP não encontrado.`);
                return;
            }
            internalPlanId = internalPlan.id;
        } else if (parts.length >= 4 && parts[2] === 'plan') {
            internalPlanId = parseInt(parts[3], 10);
            if (isNaN(internalPlanId)) {
                console.error("ID do plano inválido na external reference para pagamento único:", externalReference);
                return;
            }
        }

        if (!internalPlanId) {
            console.error("Não foi possível determinar o plano interno.");
            return;
        }

        const existingSubscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.userId, userId),
        });

        if (existingSubscription) {
            await db.update(subscriptions)
                .set({
                    planId: internalPlanId,
                    status: "active",
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, existingSubscription.id));
        } else {
            const now = new Date();
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            await db.insert(subscriptions).values({
                userId,
                planId: internalPlanId,
                status: "active",
                startDate: now,
                endDate,
                autoRenew: true,
            });
        }

        console.log(`✅ Assinatura ativada/atualizada para usuário: ${userId}`);

    } catch (error) {
        console.error("Erro ao ativar assinatura:", error);
    }
}

// Método GET para verificação de saúde do webhook
export async function GET() {
    return NextResponse.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        configured: !!(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_WEBHOOK_SECRET)
    });
} 
