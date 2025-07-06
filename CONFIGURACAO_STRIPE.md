# Configuração do Stripe

Este documento explica como configurar a integração com o Stripe para processar pagamentos de assinaturas no Buzz SaaS.

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# URLs da Aplicação
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Como Obter as Credenciais

### 1. Criar Conta no Stripe

1. Acesse [https://stripe.com](https://stripe.com)
2. Clique em "Sign up" para criar uma conta
3. Complete o processo de verificação

### 2. Obter as Chaves da API

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com)
2. No menu lateral, clique em "Developers" → "API keys"
3. Copie as chaves:
   - **Publishable key**: Começa com `pk_test_` (para teste) ou `pk_live_` (para produção)
   - **Secret key**: Começa com `sk_test_` (para teste) ou `sk_live_` (para produção)

### 3. Configurar Webhook

1. No Dashboard do Stripe, vá para "Developers" → "Webhooks"
2. Clique em "Add endpoint"
3. Configure:
   - **Endpoint URL**: `https://seu-dominio.com/api/webhooks/stripe`
   - **Events to send**: Selecione os seguintes eventos:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Salve o endpoint
5. Copie o **Signing secret** (começa com `whsec_`)

## Configuração para Desenvolvimento

Para desenvolvimento local, você pode usar o Stripe CLI para receber webhooks:

```bash
# Instalar Stripe CLI
npm install -g stripe-cli

# Fazer login
stripe login

# Encaminhar webhooks para localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

O comando acima fornecerá um webhook secret temporário que você pode usar durante o desenvolvimento.

## Configuração para Produção

1. **Alterar para chaves de produção**: Substitua as chaves de teste (`sk_test_`, `pk_test_`) pelas chaves de produção (`sk_live_`, `pk_live_`)
2. **Configurar webhook de produção**: Crie um novo endpoint webhook apontando para sua URL de produção
3. **Atualizar NEXT_PUBLIC_BASE_URL**: Defina como sua URL de produção

## Testando a Integração

### Cartões de Teste

Use estes números de cartão para testar:

- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **Requer autenticação**: `4000 0025 0000 3155`

**Dados adicionais para teste**:
- **Expiração**: Qualquer data futura (ex: 12/34)
- **CVC**: Qualquer 3 dígitos (ex: 123)
- **CEP**: Qualquer CEP válido

### Verificar Funcionamento

1. Acesse `/dashboard/configuracoes`
2. Verifique se o status da integração mostra "Conectado"
3. Teste a criação de uma assinatura
4. Verifique se os webhooks estão sendo recebidos nos logs

## Recursos Implementados

- ✅ Criação de sessões de checkout para assinaturas
- ✅ Processamento de webhooks para eventos de pagamento
- ✅ Cancelamento de assinaturas
- ✅ Verificação de status de conexão
- ✅ Interface de usuário para gerenciar assinaturas
- ✅ Suporte para diferentes status de assinatura (ativo, cancelado, em atraso)

## Próximos Passos

1. Configurar as variáveis de ambiente
2. Testar em modo de desenvolvimento
3. Configurar webhook de produção
4. Implementar testes automatizados (opcional)
5. Monitorar logs de webhook em produção 