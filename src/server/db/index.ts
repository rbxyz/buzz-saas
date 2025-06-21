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
  // Configurações otimizadas para Neon HTTP
  fullResults: false,
  arrayMode: false,
  fetchOptions: {
    timeout: 120000, // 2 minutos para cold starts
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

// Função para executar queries com retry para lidar com hibernação do Neon
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [DB_RETRY] Tentativa ${attempt}/${maxRetries}`)
      const startTime = Date.now()
      const result = await operation()
      const duration = Date.now() - startTime
      console.log(`✅ [DB_RETRY] Sucesso na tentativa ${attempt} em ${duration}ms`)
      return result
    } catch (error) {
      lastError = error
      const duration = Date.now()
      console.error(`❌ [DB_RETRY] Falha na tentativa ${attempt}/${maxRetries} após ${duration}ms:`, error)

      if (attempt === maxRetries) {
        console.error(`❌ [DB_RETRY] Todas as tentativas falharam. Último erro:`, error)
        throw error
      }

      // Backoff exponencial: 1s, 2s, 4s...
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`⏳ [DB_RETRY] Aguardando ${delay}ms antes da próxima tentativa...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}