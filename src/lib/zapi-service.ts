/**
 * Serviço para integração com a Z-API para envio de mensagens WhatsApp
 */

// Função para enviar mensagem via Z-API
export async function enviarMensagemWhatsApp(
  telefone: string,
  mensagem: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🚀 [ZAPI] Iniciando envio de mensagem WhatsApp...")

    // Obter configurações da Z-API
    const instanceId = process.env.ZAPI_INSTANCE_ID
    const token = process.env.ZAPI_TOKEN
    const clientToken = process.env.ZAPI_CLIENT_TOKEN

    // Validar configurações
    if (!instanceId || !token || !clientToken) {
      console.error("❌ [ZAPI] Configurações incompletas:", {
        hasInstanceId: !!instanceId,
        hasToken: !!token,
        hasClientToken: !!clientToken,
      })
      return { success: false, error: "Configurações Z-API incompletas" }
    }

    // Formatar telefone (garantir que tenha o código do país)
    const telefoneFormatado = formatarTelefone(telefone)

    console.log("📱 [ZAPI] Preparando envio:", {
      telefoneOriginal: telefone,
      telefoneFormatado,
      mensagemLength: mensagem.length,
    })

    // Construir URL conforme documentação
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`

    // Preparar payload
    const payload = {
      phone: telefoneFormatado,
      message: mensagem,
    }

    console.log("🌐 [ZAPI] Enviando requisição para:", url.replace(token, "***"))
    console.log("🔑 [ZAPI] Headers incluem Client-Token:", !!clientToken)

    // Enviar requisição
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify(payload),
    })

    console.log("📥 [ZAPI] Resposta recebida:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    // Processar resposta
    const data = await response.json()
    console.log("📊 [ZAPI] Corpo da resposta:", data)

    // Verificar se a mensagem foi enviada com sucesso
    // Z-API pode retornar diferentes formatos de resposta
    if (data.zaapId || data.messageId || data.id || (data.status && data.status === "success")) {
      console.log("✅ [ZAPI] Mensagem enviada com sucesso:", data)
      return { success: true }
    }

    // Se chegou aqui, houve algum problema
    console.error("❌ [ZAPI] Erro na resposta:", data)
    return {
      success: false,
      error: data.message || data.error || `Erro na resposta da API`,
    }
  } catch (error) {
    console.error("💥 [ZAPI] Erro ao enviar mensagem:", error)
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

    console.log("🔍 [ZAPI-STATUS] Verificando status em:", url.replace(token, "***"))
    console.log("🔑 [ZAPI-STATUS] Headers incluem Client-Token:", !!clientToken)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
    })

    console.log("📥 [ZAPI-STATUS] Resposta HTTP:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    const data = await response.json()
    console.log("📊 [ZAPI-STATUS] Corpo da resposta:", data)

    // Verificar se a instância está conectada
    // A Z-API pode retornar diferentes formatos de resposta

    // Caso especial: "You are already connected" significa que está conectado
    if (data.error === "You are already connected.") {
      console.log("✅ [ZAPI-STATUS] Instância já está conectada")
      return { connected: true }
    }

    // Verificar outros formatos de resposta positiva
    const connected =
      data.connected === true ||
      data.status === "CONNECTED" ||
      data.status === "ONLINE" ||
      (data.value && data.value.status === "CONNECTED")

    if (connected) {
      console.log("✅ [ZAPI-STATUS] Instância está conectada")
      return { connected: true }
    }

    // Se chegou aqui, não está conectado
    console.log("❌ [ZAPI-STATUS] Instância não está conectada:", data)
    return {
      connected: false,
      error: data.message || data.error || "Status desconhecido",
    }
  } catch (error) {
    console.error("💥 [ZAPI-STATUS] Erro ao verificar status:", error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Erro ao verificar status",
    }
  }
}
