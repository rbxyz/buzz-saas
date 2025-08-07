import { db } from "../src/server/db";
import { sql } from "drizzle-orm";

async function removeIntervalosConstraint() {
    try {
        console.log("🚀 Removendo constraint única da tabela intervalos_trabalho...");

        // Remover a constraint única
        await db.execute(sql`
            ALTER TABLE "intervalos_trabalho" DROP CONSTRAINT IF EXISTS "intervalos_trabalho_user_id_dia_semana_unique";
        `);

        console.log("✅ Constraint única removida com sucesso!");
        console.log("🎉 Agora é possível salvar múltiplos intervalos por dia da semana!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Erro ao remover constraint:", error);
        process.exit(1);
    }
}

removeIntervalosConstraint(); 