import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { env } from "@/env"
import * as schema from "./schema"

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