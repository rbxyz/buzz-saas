/**
 * Serviço para integração com a Z-API para envio de mensagens WhatsApp
 */

import { env } from "@/env"

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
    console.log(`🚀 [ZAPI-SERVICE] Iniciando envio para ${telefone}`)

    // Obter configurações da Z-API
    const instanceId = env.ZAPI_INSTANCE_ID ?? process.env.ZAPI_INSTANCE_ID
    const token = env.ZAPI_TOKEN ?? process.env.ZAPI_TOKEN
    const clientToken = env.ZAPI_CLIENT_TOKEN ?? process.env.ZAPI_CLIENT_TOKEN

    console.log(`🔧 [ZAPI-SERVICE] Configurações - Instance ID: ${instanceId ? 'Definido' : 'Não definido'}, Token: ${token ? 'Definido' : 'Não definido'}, Client Token: ${clientToken ? 'Definido' : 'Não definido'}`)

    // Validar configurações
    if (!instanceId || !token || !clientToken) {
      const erro = "Configurações Z-API incompletas"
      console.error(`❌ [ZAPI-SERVICE] ${erro}`)
      return { success: false, error: erro }
    }

    // Formatar telefone (garantir que tenha o código do país)
    const telefoneFormatado = formatarTelefone(telefone)
    console.log(`📱 [ZAPI-SERVICE] Telefone formatado: ${telefone} -> ${telefoneFormatado}`)

    // Construir URL conforme documentação
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`
    console.log(`🔗 [ZAPI-SERVICE] URL: ${url}`)

    // Preparar payload
    const payload = {
      phone: telefoneFormatado,
      message: mensagem,
    }

    console.log(`📦 [ZAPI-SERVICE] Payload:`, JSON.stringify(payload, null, 2))

    // Enviar requisição
    console.log(`⏳ [ZAPI-SERVICE] Enviando requisição...`)
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify(payload),
    })

    console.log(`📊 [ZAPI-SERVICE] Status da resposta: ${response.status}`)

    // Processar resposta
    const data = (await response.json()) as ZApiMessageSuccessResponse | ZApiErrorResponse
    console.log(`📋 [ZAPI-SERVICE] Resposta da API:`, JSON.stringify(data, null, 2))

    // Verificar se a mensagem foi enviada com sucesso
    // Z-API pode retornar diferentes formatos de resposta
    const successResponse = data as ZApiMessageSuccessResponse
    if (successResponse.zaapId ?? successResponse.messageId ?? successResponse.id ?? successResponse.status === "success") {
      console.log(`✅ [ZAPI-SERVICE] Mensagem enviada com sucesso!`)
      return { success: true }
    }

    // Se chegou aqui, houve algum problema
    const errorResponse = data as ZApiErrorResponse
    const erro = errorResponse.message ?? errorResponse.error ?? `Erro na resposta da API`
    console.error(`❌ [ZAPI-SERVICE] Erro: ${erro}`)
    return {
      success: false,
      error: erro,
    }
  } catch (error) {
    const erro = error instanceof Error ? error.message : "Erro desconhecido ao enviar mensagem"
    console.error(`💥 [ZAPI-SERVICE] Exceção:`, error)
    return {
      success: false,
      error: erro,
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
    const instanceId = env.ZAPI_INSTANCE_ID ?? process.env.ZAPI_INSTANCE_ID
    const token = env.ZAPI_TOKEN ?? process.env.ZAPI_TOKEN
    const clientToken = env.ZAPI_CLIENT_TOKEN ?? process.env.ZAPI_CLIENT_TOKEN

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