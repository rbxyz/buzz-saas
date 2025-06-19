// Utilitário para retry de operações de banco de dados com configurações otimizadas para Neon
export interface RetryOptions {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
    retryCondition?: (error: Error) => boolean
}

export class DatabaseRetryError extends Error {
    public readonly originalError: Error
    public readonly attempts: number

    constructor(originalError: Error, attempts: number) {
        super(`Database operation failed after ${attempts} attempts: ${originalError.message}`)
        this.name = 'DatabaseRetryError'
        this.originalError = originalError
        this.attempts = attempts
    }
}

export async function withDatabaseRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2,
        retryCondition = isRetryableError,
    } = options

    let lastError: Error
    let attempts = 0

    while (attempts <= maxRetries) {
        try {
            return await operation()
        } catch (error) {
            lastError = error as Error
            attempts++

            console.warn(`🔄 [DATABASE-RETRY] Tentativa ${attempts}/${maxRetries + 1} falhou:`, {
                error: lastError.message,
                attempts,
                willRetry: attempts <= maxRetries && retryCondition(lastError),
            })

            // Se não deve fazer retry ou já esgotou as tentativas
            if (attempts > maxRetries || !retryCondition(lastError)) {
                break
            }

            // Calcular delay com backoff exponencial
            const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempts - 1), maxDelay)

            console.log(`⏳ [DATABASE-RETRY] Aguardando ${delay}ms antes da próxima tentativa...`)
            await sleep(delay)
        }
    }

    throw new DatabaseRetryError(lastError!, attempts)
}

// Função para verificar se um erro é retryable
function isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // Erros relacionados a conexão/rede que são retryable
    const retryablePatterns = [
        'fetch failed',
        'socket error',
        'other side closed',
        'connection',
        'timeout',
        'econnreset',
        'enotfound',
        'etimedout',
        'network',
        'neondbeerror',
    ]

    // Erros que NÃO devem ser retried
    const nonRetryablePatterns = [
        'syntax error',
        'column does not exist',
        'relation does not exist',
        'permission denied',
        'authentication',
        'unique constraint',
        'foreign key constraint',
        'check constraint',
    ]

    // Verificar se é um erro não retryable
    if (nonRetryablePatterns.some(pattern => message.includes(pattern) || name.includes(pattern))) {
        return false
    }

    // Verificar se é um erro retryable
    return retryablePatterns.some(pattern => message.includes(pattern) || name.includes(pattern))
}

// Utilitário para delay
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Wrapper específico para operações do Drizzle
export async function withDrizzleRetry<T>(
    operation: () => Promise<T>,
    context?: string
): Promise<T> {
    return withDatabaseRetry(operation, {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 8000,
        backoffFactor: 2,
        retryCondition: (error) => {
            const shouldRetry = isRetryableError(error)

            if (context) {
                console.log(`🔄 [DRIZZLE-RETRY] ${context} - Retry: ${shouldRetry ? 'SIM' : 'NÃO'}`)
            }

            return shouldRetry
        },
    })
} 