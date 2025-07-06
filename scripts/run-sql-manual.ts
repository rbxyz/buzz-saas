import { db } from "../src/server/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runManualSQL() {
    try {
        console.log("🚀 Executando SQL manual para criar tabelas...");

        // Ler o arquivo SQL
        const sqlPath = path.join(__dirname, "create-tables-manual.sql");
        const sqlContent = fs.readFileSync(sqlPath, "utf8");

        // Executar o SQL
        await db.execute(sql.raw(sqlContent));

        console.log("✅ Tabelas criadas com sucesso!");

        // Agora popular os planos
        console.log("🚀 Populando planos iniciais...");

        // Plano Starter
        await db.execute(sql`
      INSERT INTO plans (name, type, price, features, limits, is_active)
      VALUES (
        'Starter',
        'starter'::plan_type_enum,
        29.90,
        '["Até 30 agendamentos por mês", "Análise de desempenho básica", "Métricas básicas", "Agendamentos recentes", "Gestão de clientes", "Serviços ilimitados"]'::jsonb,
        '{"monthlyBookings": 30, "maxUsers": 1, "whatsappIntegration": false, "advancedAnalytics": false, "customTheme": false}'::jsonb,
        true
      )
      ON CONFLICT (type) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        features = EXCLUDED.features,
        limits = EXCLUDED.limits,
        updated_at = NOW()
    `);

        console.log("✅ Plano Starter criado/atualizado");

        // Plano Pro
        await db.execute(sql`
      INSERT INTO plans (name, type, price, features, limits, is_active)
      VALUES (
        'Pro',
        'pro'::plan_type_enum,
        79.90,
        '["Agendamentos ilimitados", "Integração WhatsApp", "Análises aprofundadas", "Métricas de crescimento", "Relatórios avançados", "Configuração de tema", "Gerenciamento de usuários", "Usuários ilimitados", "Suporte prioritário", "Backup automático"]'::jsonb,
        '{"monthlyBookings": -1, "maxUsers": -1, "whatsappIntegration": true, "advancedAnalytics": true, "customTheme": true}'::jsonb,
        true
      )
      ON CONFLICT (type) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        features = EXCLUDED.features,
        limits = EXCLUDED.limits,
        updated_at = NOW()
    `);

        console.log("✅ Plano Pro criado/atualizado");

        console.log("🎉 Setup do sistema de planos concluído com sucesso!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Erro ao executar setup:", error);
        process.exit(1);
    }
}

runManualSQL(); 