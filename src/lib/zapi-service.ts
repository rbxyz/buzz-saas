/**
 * Serviço para integração com a Z-API para envio de mensagens WhatsApp
 */

// --- Interfaces para as respostas da Z-API ---
interface ZApiMessageSuccessResponse {
  zaapId?: string
  messageId?: string
  id?: string
  status?: "success"
}

interface ZApiStatusResponse {
  connected?: boolean
  status?: "CONNECTED" | "ONLINE"
  value?: {
    status?: "CONNECTED"
  }
  error?: string
  message?: string
}

interface ZApiErrorResponse {
  message?: string
  error?: string
}

// Função para enviar mensagem via Z-API
export async function enviarMensagemWhatsApp(
  telefone: string,
  mensagem: string,
): Promise<{ success: boolean; error?: string }> {
  try {

    // Obter configurações da Z-API
    const instanceId = process.env.ZAPI_INSTANCE_ID
    const token = process.env.ZAPI_TOKEN
    const clientToken = process.env.ZAPI_CLIENT_TOKEN

    // Validar configurações
    if (!instanceId || !token || !clientToken) {
      return { success: false, error: "Configurações Z-API incompletas" }
    }

    // Formatar telefone (garantir que tenha o código do país)
    const telefoneFormatado = formatarTelefone(telefone)

    // Construir URL conforme documentação
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`

    // Preparar payload
    const payload = {
      phone: telefoneFormatado,
      message: mensagem,
    }
    // Enviar requisição
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify(payload),
    })

    // Processar resposta
    const data = (await response.json()) as ZApiMessageSuccessResponse | ZApiErrorResponse

    // Verificar se a mensagem foi enviada com sucesso
    // Z-API pode retornar diferentes formatos de resposta
    const successResponse = data as ZApiMessageSuccessResponse
    if (successResponse.zaapId ?? successResponse.messageId ?? successResponse.id ?? successResponse.status === "success") {
      return { success: true }
    }

    // Se chegou aqui, houve algum problema
    const errorResponse = data as ZApiErrorResponse
    return {
      success: false,
      error: errorResponse.message ?? errorResponse.error ?? `Erro na resposta da API`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido ao enviar mensagem",
    }
  }
}

// Função para formatar telefone
function formatarTelefone(telefone: string): string {
  // Remover caracteres não numéricos
  const numeroLimpo = telefone.replace(/\D/g, "")

  // Verificar se já tem o código do país (55)
  if (numeroLimpo.startsWith("55")) {
    return numeroLimpo
  }

  // Adicionar código do país
  return `55${numeroLimpo}`
}

// Função para verificar status da instância Z-API
export async function verificarStatusZApi(): Promise<{ connected: boolean; error?: string }> {
  try {
    const instanceId = process.env.ZAPI_INSTANCE_ID
    const token = process.env.ZAPI_TOKEN
    const clientToken = process.env.ZAPI_CLIENT_TOKEN

    if (!instanceId || !token || !clientToken) {
      return { connected: false, error: "Configurações Z-API incompletas" }
    }

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/status`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
    })

    const data = (await response.json()) as ZApiStatusResponse

    // Caso especial: "You are already connected" significa que está conectado
    if (data.error === "You are already connected.") {
      return { connected: true }
    }

    // Verificar outros formatos de resposta positiva
    const connected = data.connected === true || data.status === "CONNECTED" || data.status === "ONLINE" || data.value?.status === "CONNECTED"

    if (connected) {
      return { connected: true }
    }

    // Se chegou aqui, não está conectado
    return {
      connected: false,
      error: data.message ?? data.error ?? "Status desconhecido",
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Erro ao verificar status",
    }
  }
}
