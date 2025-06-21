import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { env } from "@/env"
import * as schema from "./schema"

console.log(`🔧 [DB_INIT] Inicializando cliente do banco de dados...`)
console.log(`🔧 [DB_INIT] NODE_ENV:`, process.env.NODE_ENV)
console.log(`🔧 [DB_INIT] DATABASE_URL presente:`, !!env.DATABASE_URL)
console.log(`🔧 [DB_INIT] DATABASE_URL length:`, env.DATABASE_URL?.length || 0)

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente")
}

// Configurar conexão SQL usando Neon HTTP com configurações otimizadas para produção
console.log(`🔧 [DB_INIT] Configurando cliente Neon com timeout de 60s...`)
const sql = neon(env.DATABASE_URL, {
  // Configurações otimizadas para o driver neon-http
  fullResults: false, // Otimizar para resultados menores
  arrayMode: false, // Usar objetos ao invés de arrays
  fetchOptions: {
    // Configurações de timeout aumentadas para lidar com hibernação do banco
    timeout: 60000, // 60 segundos timeout para requisições (banco pode estar hibernado)
  },
})

console.log(`🔧 [DB_INIT] Cliente Neon configurado, criando instância Drizzle...`)
// Configurar Drizzle com schema e logs apenas em desenvolvimento
export const db = drizzle(sql, {
  schema,
  logger: env.NODE_ENV === "development", // Logs apenas em dev para evitar overhead
})

console.log(`🔧 [DB_INIT] Drizzle inicializado com sucesso`)
console.log(`🔧 [DB_INIT] Tipo do db:`, typeof db)
console.log(`🔧 [DB_INIT] Métodos disponíveis:`, Object.getOwnPropertyNames(Object.getPrototypeOf(db)))