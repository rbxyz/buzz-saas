# Variáveis de Ambiente Necessárias para o Mercado Pago

## Configure as seguintes variáveis no seu arquivo .env:

# Mercado Pago - Credenciais de Produção
MERCADO_PAGO_PUBLIC_KEY="APP_USR-sua-chave-publica-aqui"
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-seu-access-token-aqui"
MERCADO_PAGO_WEBHOOK_URL="https://seu-dominio.com/api/webhooks/mercado-pago"
MERCADO_PAGO_WEBHOOK_SECRET="sua-chave-secreta-webhook"

# URL base da aplicação
NEXT_PUBLIC_BASE_URL="https://seu-dominio.com"

## Como obter as credenciais:
1. Acesse https://www.mercadopago.com.br/developers/
2. Entre na sua conta
3. Vá em 'Credenciais'
4. Copie a Chave Pública e Access Token de PRODUÇÃO
5. Configure o webhook URL no painel do Mercado Pago

