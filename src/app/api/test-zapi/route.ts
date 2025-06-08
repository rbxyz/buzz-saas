import { NextResponse } from "next/server"
import { enviarMensagemWhatsApp, verificarStatusZApi } from "@/lib/zapi-service"

export async function GET(request: Request) {
  try {
    // Obter parâmetros da URL
    const url = new URL(request.url)
    const telefone = url.searchParams.get("telefone") ?? "555198761413" // Telefone padrão para teste
    const mensagem = url.searchParams.get("mensagem") ??  "Esta é uma mensagem de teste da API Z-API ✅"
    const skipStatus = url.searchParams.get("skipStatus") === "true" // Opção para pular verificação de status

    console.log("🧪 [TEST-WHATSAPP] Iniciando teste de envio de mensagem")
    console.log("📱 [TEST-WHATSAPP] Telefone:", telefone)
    console.log("💬 [TEST-WHATSAPP] Mensagem:", mensagem)
    console.log("⚙️ [TEST-WHATSAPP] Pular verificação de status:", skipStatus)

    let statusResult = { connected: true }

    // Verificar status da instância (opcional)
    if (!skipStatus) {
      console.log("🔍 [TEST-WHATSAPP] Verificando status da instância Z-API...")
      statusResult = await verificarStatusZApi()
      console.log("📊 [TEST-WHATSAPP] Status da instância:", statusResult)

      // Interpretar "You are already connected" como conectado
      if (statusResult.error === "You are already connected.") {
        console.log("✅ [TEST-WHATSAPP] Instância já está conectada (mensagem especial)")
        statusResult.connected = true
      }
    }

    // Continuar mesmo se o status for negativo (para testar)
    if (!statusResult.connected && !skipStatus) {
      console.log("⚠️ [TEST-WHATSAPP] Instância não está conectada, mas tentaremos enviar mesmo assim")
    }

    // Enviar mensagem de teste
    console.log("📤 [TEST-WHATSAPP] Enviando mensagem de teste...")
    const result = await enviarMensagemWhatsApp(telefone, mensagem)

    console.log("📊 [TEST-WHATSAPP] Resultado do envio:", result)

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Mensagem enviada com sucesso" : "Falha ao enviar mensagem",
      error: result.error,
      statusResult,
    })
  } catch (error) {
    console.error("💥 [TEST-WHATSAPP] Erro no teste:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido no teste",
      },
      { status: 500 },
    )
  }
}
