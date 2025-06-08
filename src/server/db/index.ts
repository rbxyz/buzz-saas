import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { env } from "@/env"
import * as schema from "./schema"

// Adicionar logs para debug
console.log("🔍 [DATABASE] Configurando conexão com banco...")
console.log("🔍 [DATABASE] DATABASE_URL existe:", !!env.DATABASE_URL)

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente")
}

// Criar conexão SQL usando Neon
const sql = neon(env.DATABASE_URL)

// Configurar Drizzle com schema e logs
export const db = drizzle(sql, {
  schema,
  logger: true, // Ativar logs do Drizzle para debug
})

// Testar conexão na inicialização
sql`SELECT NOW() as connection_test, current_database() as database_name, COUNT(*) as total_conversations FROM conversations`
  .then((result) => {
    console.log("✅ [DATABASE] Conexão testada com sucesso:")
    console.log("✅ [DATABASE] Resultado:", result)
  })
  .catch((error) => {
    console.error("❌ [DATABASE] Erro ao testar conexão:", error)
  })
