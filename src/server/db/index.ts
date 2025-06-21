import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { env } from "@/env"
import * as schema from "./schema"

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente")
}

// Configurar conexão SQL usando postgres-js com configurações otimizadas para serverless
const connectionString = env.DATABASE_URL

// Configurar cliente postgres com pool de conexões otimizado para serverless
const sql = postgres(connectionString, {
  max: 1, // Máximo 1 conexão para ambiente serverless
  idle_timeout: 20, // 20 segundos timeout para conexões ociosas
  connect_timeout: 10, // 10 segundos timeout para conectar
  ssl: 'require', // Forçar SSL
  prepare: false, // Desabilitar prepared statements para melhor compatibilidade
})

// Configurar Drizzle com schema e logs apenas em desenvolvimento
export const db = drizzle(sql, {
  schema,
  logger: env.NODE_ENV === "development", // Logs apenas em dev para evitar overhead
})