import { db } from "@/server/db";
import { subscriptions, agendamentos, users } from "@/server/db/schema";
import { eq, and, gte, lte, count } from "drizzle-orm";
import dayjs from "dayjs";

export interface SubscriptionLimits {
    monthlyBookings: number; // -1 para ilimitado
    maxUsers: number; // -1 para ilimitado
    whatsappIntegration: boolean;
    advancedAnalytics: boolean;
    customTheme: boolean;
    unlimitedUsers: boolean;
    unlimitedBookings: boolean;
}

export interface SubscriptionFeatures {
    whatsappIntegration: boolean;
    advancedAnalytics: boolean;
    customTheme: boolean;
    unlimitedUsers: boolean;
    unlimitedBookings: boolean;
}

export interface SubscriptionInfo {
    isActive: boolean;
    planType: "starter" | "pro" | null;
    planName: string | null;
    limits: SubscriptionLimits | null;
    endDate: Date | null;
}

export class SubscriptionService {
    /**
     * Obter informações da assinatura atual do usuário
     */
    static async getUserSubscription(userId: number): Promise<SubscriptionInfo> {
        const subscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.status, "active")
            ),
            with: {
                plan: true,
            },
        });

        if (!subscription) {
            return {
                isActive: false,
                planType: null,
                planName: null,
                limits: null,
                endDate: null,
            };
        }

        return {
            isActive: true,
            planType: subscription.plan.type as "starter" | "pro",
            planName: subscription.plan.name,
            limits: null, // limits foi removido da tabela plans
            endDate: subscription.endDate,
        };
    }

    /**
     * Verifica se o usuário tem acesso a uma feature específica
     */
    static async checkFeatureAccess(userId: number, feature: keyof SubscriptionFeatures): Promise<boolean> {
        try {
            const subscription = await db.query.subscriptions.findFirst({
                where: and(
                    eq(subscriptions.userId, userId),
                    eq(subscriptions.status, "active")
                ),
                with: {
                    plan: true
                }
            });

            if (!subscription) {
                return false;
            }

            const features = subscription.plan.features as SubscriptionFeatures;
            return features[feature] ?? false;
        } catch (error) {
            console.error('Erro ao verificar acesso à feature:', error);
            return false;
        }
    }

    /**
     * Verifica se o usuário pode criar mais agendamentos este mês
     */
    static async checkMonthlyBookingsLimit(userId: number): Promise<{
        canCreate: boolean;
        current: number;
        limit: number;
        message: string;
    }> {
        try {
            const subscription = await db.query.subscriptions.findFirst({
                where: and(
                    eq(subscriptions.userId, userId),
                    eq(subscriptions.status, "active")
                ),
                with: {
                    plan: true
                }
            });

            if (!subscription) {
                return {
                    canCreate: false,
                    current: 0,
                    limit: 0,
                    message: "Nenhuma assinatura ativa encontrada"
                };
            }

            // Como limits foi removido, usar valores padrão baseados no tipo do plano
            const monthlyBookings = subscription.plan.type === 'pro' ? -1 : 30;

            // Se tem agendamentos ilimitados
            if (monthlyBookings === -1) {
                return {
                    canCreate: true,
                    current: 0,
                    limit: -1,
                    message: "Agendamentos ilimitados"
                };
            }

            // Calcular início e fim do mês atual
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            // Contar agendamentos do mês atual
            const [result] = await db
                .select({ count: count() })
                .from(agendamentos)
                .where(
                    and(
                        eq(agendamentos.userId, userId),
                        gte(agendamentos.dataHora, startOfMonth),
                        lte(agendamentos.dataHora, endOfMonth)
                    )
                );

            const current = result?.count ?? 0;
            const canCreate = current < monthlyBookings;

            return {
                canCreate,
                current,
                limit: monthlyBookings,
                message: canCreate
                    ? `${current}/${monthlyBookings} agendamentos este mês`
                    : `Limite de ${monthlyBookings} agendamentos mensais atingido`
            };
        } catch (error) {
            console.error('Erro ao verificar limite de agendamentos:', error);
            return {
                canCreate: false,
                current: 0,
                limit: 0,
                message: "Erro ao verificar limite de agendamentos"
            };
        }
    }

    /**
     * Verificar limite de usuários
     */
    static async checkUserLimit(userId: number): Promise<{
        hasAccess: boolean;
        currentCount: number;
        maxCount: number;
        message: string;
    }> {
        const subscription = await this.getUserSubscription(userId);

        if (!subscription.isActive) {
            return {
                hasAccess: false,
                currentCount: 0,
                maxCount: 0,
                message: "Nenhuma assinatura ativa encontrada",
            };
        }

        // Como limits foi removido, usar valores padrão baseados no tipo do plano
        const userLimit = subscription.planType === 'pro' ? -1 : 1;

        // Se for ilimitado
        if (userLimit === -1) {
            return {
                hasAccess: true,
                currentCount: 0,
                maxCount: -1,
                message: "Usuários ilimitados",
            };
        }

        // Contar usuários atuais
        const currentUsers = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.id, userId));

        const currentCount = currentUsers[0]?.count ?? 0;

        return {
            hasAccess: currentCount < userLimit,
            currentCount,
            maxCount: userLimit,
            message: currentCount >= userLimit
                ? `Limite de ${userLimit} usuários atingido`
                : `${currentCount}/${userLimit} usuários`,
        };
    }

    /**
     * Verificar se a assinatura está próxima do vencimento
     */
    static async checkExpirationWarning(userId: number): Promise<{
        isNearExpiration: boolean;
        daysUntilExpiration: number;
        message: string;
    }> {
        const subscription = await this.getUserSubscription(userId);

        if (!subscription.isActive || !subscription.endDate) {
            return {
                isNearExpiration: false,
                daysUntilExpiration: 0,
                message: "Nenhuma assinatura ativa",
            };
        }

        const now = dayjs();
        const endDate = dayjs(subscription.endDate);
        const daysUntilExpiration = endDate.diff(now, "day");

        const isNearExpiration = daysUntilExpiration <= 7; // Aviso nos últimos 7 dias

        return {
            isNearExpiration,
            daysUntilExpiration,
            message: isNearExpiration
                ? `Sua assinatura vence em ${daysUntilExpiration} dia(s)`
                : `Assinatura válida até ${endDate.format("DD/MM/YYYY")}`,
        };
    }

    /**
     * Obter resumo completo da assinatura do usuário
     */
    static async getSubscriptionSummary(userId: number) {
        const subscription = await this.getUserSubscription(userId);
        const bookingLimit = await this.checkMonthlyBookingsLimit(userId);
        const userLimit = await this.checkUserLimit(userId);
        const expirationWarning = await this.checkExpirationWarning(userId);

        return {
            subscription,
            bookingLimit,
            userLimit,
            expiration: expirationWarning,
            features: {
                whatsapp: await this.checkFeatureAccess(userId, "whatsappIntegration"),
                advancedAnalytics: await this.checkFeatureAccess(userId, "advancedAnalytics"),
                customTheme: await this.checkFeatureAccess(userId, "customTheme"),
                unlimitedUsers: await this.checkFeatureAccess(userId, "unlimitedUsers"),
                unlimitedBookings: await this.checkFeatureAccess(userId, "unlimitedBookings"),
            },
        };
    }

    /**
     * Middleware para verificar acesso a features
     */
    static createFeatureGuard(requiredFeature: string) {
        return async (userId: number) => {
            const hasAccess = await this.checkFeatureAccess(userId, requiredFeature as keyof SubscriptionFeatures);

            if (!hasAccess) {
                throw new Error(`Feature '${requiredFeature}' não disponível no seu plano atual`);
            }

            return true;
        };
    }

    /**
     * Verificar se o usuário pode criar um agendamento
     */
    static async checkBookingAccess(userId: number): Promise<void> {
        const bookingLimit = await this.checkMonthlyBookingsLimit(userId);

        if (!bookingLimit.canCreate) {
            throw new Error(bookingLimit.message);
        }
    }

    /**
     * Middleware para verificar limite de usuários
     */
    static async checkUserAccess(userId: number): Promise<void> {
        const userLimit = await this.checkUserLimit(userId);

        if (!userLimit.hasAccess) {
            throw new Error(userLimit.message);
        }
    }
} 