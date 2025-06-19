import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { env } from "@/env"
import * as schema from "./schema"

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente")
}

// Configurar conexão SQL usando Neon com configurações otimizadas para produção
const sql = neon(env.DATABASE_URL, {
  // Configurações corretas para o driver neon-http
  fullResults: false, // Otimizar para resultados menores
  arrayMode: false, // Usar objetos ao invés de arrays
  fetchOptions: {
    // Configurações de timeout para requisições HTTP
    timeout: 30000, // 30 segundos timeout para requisições
    signal: env.NODE_ENV === "production" ? undefined : undefined,
  },
})

// Configurar Drizzle com schema e logs apenas em desenvolvimento
export const db = drizzle(sql, {
  schema,
  logger: env.NODE_ENV === "development", // Logs apenas em dev para evitar overhead
})