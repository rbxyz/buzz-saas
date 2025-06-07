interface ZApiConfig {
    instanceId: string
    token: string
    baseUrl?: string
  }
  
  interface SendMessagePayload {
    phone: string
    message: string
    messageId?: string
  }
  
  interface ZApiResponse {
    success: boolean
    data?: any
    error?: string
  }
  
  export class ZApiService {
    private config: ZApiConfig
    private baseUrl: string
  
    constructor(config: ZApiConfig) {
      this.config = config
      this.baseUrl = config.baseUrl ?? "https://api.z-api.io"
    }
  
    private async makeRequest(endpoint: string, method: "GET" | "POST" = "GET", data?: any): Promise<ZApiResponse> {
      try {
        const url = `${this.baseUrl}/instances/${this.config.instanceId}/${endpoint}`
  
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Client-Token": this.config.token,
          },
          body: data ? JSON.stringify(data) : undefined,
        })
  
        const result = await response.json()
  
        if (!response.ok) {
          return {
            success: false,
            error: result.message || "Erro na requisição para Z-API",
          }
        }
  
        return {
          success: true,
          data: result,
        }
      } catch (error) {
        console.error("Erro na requisição Z-API:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        }
      }
    }
  
    async sendMessage({ phone, message, messageId }: SendMessagePayload): Promise<ZApiResponse> {
      const payload = {
        phone: this.formatPhone(phone),
        message,
        messageId,
      }
  
      return this.makeRequest("send-text", "POST", payload)
    }
  
    async sendImage(phone: string, imageUrl: string, caption?: string): Promise<ZApiResponse> {
      const payload = {
        phone: this.formatPhone(phone),
        image: imageUrl,
        caption,
      }
  
      return this.makeRequest("send-image", "POST", payload)
    }
  
    async getInstanceStatus(): Promise<ZApiResponse> {
      return this.makeRequest("status")
    }
  
    async getQRCode(): Promise<ZApiResponse> {
      return this.makeRequest("qr-code")
    }
  
    async disconnectInstance(): Promise<ZApiResponse> {
      return this.makeRequest("disconnect", "POST")
    }
  
    async restartInstance(): Promise<ZApiResponse> {
      return this.makeRequest("restart", "POST")
    }
  
    private formatPhone(phone: string): string {
      // Remove todos os caracteres não numéricos
      const cleanPhone = phone.replace(/\D/g, "")
  
      // Se não começar com 55 (código do Brasil), adiciona
      if (!cleanPhone.startsWith("55")) {
        return `55${cleanPhone}`
      }
  
      return cleanPhone
    }
  
    // Método para validar se a instância está conectada
    async isConnected(): Promise<boolean> {
      try {
        const status = await this.getInstanceStatus()
        return status.success && status.data?.connected === true
      } catch {
        return false
      }
    }
  
    // Método para enviar mensagem com retry
    async sendMessageWithRetry(payload: SendMessagePayload, maxRetries = 3): Promise<ZApiResponse> {
      let lastError = ""
  
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await this.sendMessage(payload)
  
        if (result.success) {
          return result
        }
  
        lastError = result.error || "Erro desconhecido"
  
        if (attempt < maxRetries) {
          // Aguarda antes de tentar novamente (backoff exponencial)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
  
      return {
        success: false,
        error: `Falha após ${maxRetries} tentativas. Último erro: ${lastError}`,
      }
    }
  }
  
  // Função helper para criar uma instância do serviço
  export function createZApiService(instanceId: string, token: string): ZApiService {
    return new ZApiService({ instanceId, token })
  }
  
  // Função para obter configurações do banco de dados
  export async function getZApiConfigFromDB(): Promise<ZApiConfig | null> {
    try {
      // Aqui você buscaria as configurações do banco de dados
      // Por enquanto, vamos usar variáveis de ambiente como fallback
      const instanceId = process.env.ZAPI_INSTANCE_ID
      const token = process.env.ZAPI_TOKEN
  
      if (!instanceId || !token) {
        return null
      }
  
      return { instanceId, token }
    } catch (error) {
      console.error("Erro ao buscar configurações Z-API:", error)
      return null
    }
  }
  