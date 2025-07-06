import { db } from "../src/server/db";
import { plans } from "../src/server/db/schema";

async function populatePlans() {
    try {
        console.log("🚀 Populando planos iniciais...");

        // Plano Starter
        const starterPlan = await db.insert(plans).values({
            name: "Starter",
            type: "starter",
            price: "29.90",
            features: [
                "Até 30 agendamentos por mês",
                "Análise de desempenho básica",
                "Métricas básicas",
                "Agendamentos recentes",
                "Gestão de clientes",
                "Serviços ilimitados"
            ],
            limits: {
                monthlyBookings: 30,
                maxUsers: 1,
                whatsappIntegration: false,
                advancedAnalytics: false,
                customTheme: false,
            },
            isActive: true,
        }).onConflictDoUpdate({
            target: plans.type,
            set: {
                name: "Starter",
                price: "29.90",
                features: [
                    "Até 30 agendamentos por mês",
                    "Análise de desempenho básica",
                    "Métricas básicas",
                    "Agendamentos recentes",
                    "Gestão de clientes",
                    "Serviços ilimitados"
                ],
                limits: {
                    monthlyBookings: 30,
                    maxUsers: 1,
                    whatsappIntegration: false,
                    advancedAnalytics: false,
                    customTheme: false,
                },
                updatedAt: new Date(),
            },
        }).returning();

        console.log("✅ Plano Starter criado/atualizado:", starterPlan[0]?.id);

        // Plano Pro
        const proPlan = await db.insert(plans).values({
            name: "Pro",
            type: "pro",
            price: "79.90",
            features: [
                "Agendamentos ilimitados",
                "Integração WhatsApp",
                "Análises aprofundadas",
                "Métricas de crescimento",
                "Relatórios avançados",
                "Configuração de tema",
                "Gerenciamento de usuários",
                "Usuários ilimitados",
                "Suporte prioritário",
                "Backup automático"
            ],
            limits: {
                monthlyBookings: -1,
                maxUsers: -1,
                whatsappIntegration: true,
                advancedAnalytics: true,
                customTheme: true,
            },
            isActive: true,
        }).onConflictDoUpdate({
            target: plans.type,
            set: {
                name: "Pro",
                price: "79.90",
                features: [
                    "Agendamentos ilimitados",
                    "Integração WhatsApp",
                    "Análises aprofundadas",
                    "Métricas de crescimento",
                    "Relatórios avançados",
                    "Configuração de tema",
                    "Gerenciamento de usuários",
                    "Usuários ilimitados",
                    "Suporte prioritário",
                    "Backup automático"
                ],
                limits: {
                    monthlyBookings: -1,
                    maxUsers: -1,
                    whatsappIntegration: true,
                    advancedAnalytics: true,
                    customTheme: true,
                },
                updatedAt: new Date(),
            },
        }).returning();

        console.log("✅ Plano Pro criado/atualizado:", proPlan[0]?.id);

        console.log("🎉 Planos populados com sucesso!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Erro ao popular planos:", error);
        process.exit(1);
    }
}

populatePlans(); 