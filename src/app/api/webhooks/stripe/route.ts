import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_dummy", {
    apiVersion: "2025-06-30.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_dummy";

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const headersList = await headers();
        const signature = headersList.get("stripe-signature");

        if (!signature) {
            return NextResponse.json(
                { error: "Missing stripe-signature header" },
                { status: 400 }
            );
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
        } catch (err) {
            console.error("Webhook signature verification failed:", err);
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 400 }
            );
        }

        // Processar diferentes tipos de eventos
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            case "customer.subscription.created":
                await handleSubscriptionCreated(event.data.object);
                break;
            case "customer.subscription.updated":
                await handleSubscriptionUpdated(event.data.object);
                break;
            case "customer.subscription.deleted":
                await handleSubscriptionDeleted(event.data.object);
                break;
            case "invoice.payment_succeeded":
                await handleInvoicePaymentSucceeded(event.data.object);
                break;
            case "invoice.payment_failed":
                await handleInvoicePaymentFailed(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    try {
        console.log("Checkout session completed:", session.id);
        const userId = parseInt(session.metadata?.userId ?? "0");
        const planId = parseInt(session.metadata?.planId ?? "0");

        if (!userId || !planId) {
            console.error("Missing userId or planId in session metadata");
            return;
        }

        // Verificar se já existe uma assinatura para este usuário
        const existingSubscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.userId, userId),
        });

        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        if (existingSubscription) {
            // Atualizar assinatura existente
            await db.update(subscriptions)
                .set({
                    planId,
                    status: "active",
                    stripeSubscriptionId: session.subscription as string,
                    stripeCustomerId: session.customer as string,
                    updatedAt: now,
                })
                .where(eq(subscriptions.id, existingSubscription.id));
        } else {
            // Criar nova assinatura
            await db.insert(subscriptions).values({
                userId,
                planId,
                status: "active",
                startDate: now,
                endDate,
                autoRenew: true,
                stripeSubscriptionId: session.subscription as string,
                stripeCustomerId: session.customer as string,
            });
        }

        console.log(`✅ Subscription activated for user ${userId}`);
    } catch (error) {
        console.error("Error handling checkout session completed:", error);
    }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    try {
        console.log("Subscription created:", subscription.id);
        // A lógica principal já é tratada no checkout.session.completed
        // Aqui podemos adicionar logs ou outras ações específicas
    } catch (error) {
        console.error("Error handling subscription created:", error);
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
        console.log("Subscription updated:", subscription.id);

        // Atualizar status da assinatura no banco
        await db.update(subscriptions)
            .set({
                status: subscription.status === "active" ? "active" : "inactive",
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

        console.log(`✅ Subscription ${subscription.id} updated`);
    } catch (error) {
        console.error("Error handling subscription updated:", error);
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
        console.log("Subscription deleted:", subscription.id);

        // Cancelar assinatura no banco
        await db.update(subscriptions)
            .set({
                status: "cancelled",
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

        console.log(`✅ Subscription ${subscription.id} cancelled`);
    } catch (error) {
        console.error("Error handling subscription deleted:", error);
    }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
        console.log("Invoice payment succeeded:", invoice.id);

        const subscriptionId = (invoice as { subscription?: string }).subscription;
        if (subscriptionId && typeof subscriptionId === 'string') {
            // Atualizar data de renovação da assinatura
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            await db.update(subscriptions)
                .set({
                    endDate: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
        }
    } catch (error) {
        console.error("Error handling invoice payment succeeded:", error);
    }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    try {
        console.log("Invoice payment failed:", invoice.id);

        const subscriptionId = (invoice as { subscription?: string }).subscription;
        if (subscriptionId && typeof subscriptionId === 'string') {
            // Marcar assinatura como com problema de pagamento
            await db.update(subscriptions)
                .set({
                    status: "past_due",
                    updatedAt: new Date(),
                })
                .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
        }
    } catch (error) {
        console.error("Error handling invoice payment failed:", error);
    }
}

// Endpoint GET para verificação de saúde
export async function GET() {
    return NextResponse.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        configured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    });
} 