import { env } from "@/env"

interface ZApiResponse {
  success?: boolean
  error?: string
  message?: string
  data?: unknown
  zaapId?: string
  messageId?: string
}

const ZAPI_BASE_URL = "https://api.z-api.io/instances"
const TIMEOUT_MS = 10000

async function makeZApiRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<ZApiResponse> {
  const url = `${ZAPI_BASE_URL}/${env.ZAPI_INSTANCE_ID}/token/${env.ZAPI_TOKEN}/${endpoint}`

  console.log(`🌐 [ZAPI] ${method} ${endpoint}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Client-Token": env.ZAPI_CLIENT_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [ZAPI] Erro HTTP ${response.status}:`, errorText)
      throw new Error(`Z-API HTTP ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as ZApiResponse
    console.log(`✅ [ZAPI] Resposta recebida:`, { success: data.success })

    return data
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === "AbortError") {
      console.error(`⏰ [ZAPI] Timeout após ${TIMEOUT_MS}ms`)
      throw new Error(`Z-API timeout após ${TIMEOUT_MS}ms`)
    }

    console.error(`💥 [ZAPI] Erro na requisição:`, error)
    throw error
  }
}

export async function enviarMensagemWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
  try {
    console.log(`📤 [ZAPI] Enviando mensagem para ${telefone.substring(0, 4)}****`)

    const response = await makeZApiRequest("send-text", "POST", {
      phone: telefone,
      message: mensagem,
    })

    if (response.zaapId) {
      console.log(`✅ [ZAPI] Mensagem enviada com sucesso (ID: ${response.zaapId})`)
      return true
    } else {
      console.error(`❌ [ZAPI] Falha no envio:`, response.error ?? response.message)
      return false
    }
  } catch (error) {
    console.error(`💥 [ZAPI] Erro ao enviar mensagem:`, error)
    return false
  }
}

export async function verificarStatusInstancia(): Promise<boolean> {
  try {
    console.log(`🔍 [ZAPI] Verificando status da instância`)

    const response = await makeZApiRequest("status")

    if (response.success) {
      console.log(`✅ [ZAPI] Instância ativa`)
      return true
    } else {
      console.error(`❌ [ZAPI] Instância inativa:`, response.error ?? response.message)
      return false
    }
  } catch (error) {
    console.error(`💥 [ZAPI] Erro ao verificar status:`, error)
    return false
  }
}

export async function configurarWebhook(webhookUrl: string): Promise<boolean> {
  try {
    console.log(`🔗 [ZAPI] Configurando webhook: ${webhookUrl}`)

    const response = await makeZApiRequest("webhook", "POST", {
      url: webhookUrl,
      enabled: true,
      webhookByEvents: false,
    })

    if (response.success) {
      console.log(`✅ [ZAPI] Webhook configurado com sucesso`)
      return true
    } else {
      console.error(`❌ [ZAPI] Falha na configuração do webhook:`, response.error ?? response.message)
      return false
    }
  } catch (error) {
    console.error(`💥 [ZAPI] Erro ao configurar webhook:`, error)
    return false
  }
}
