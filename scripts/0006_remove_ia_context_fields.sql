-- Remove campos relacionados à IA e WhatsApp que agora são baseados em variáveis de ambiente
-- Execução: psql -h <host> -U <user> -d <database> -f scripts/0006_remove_ia_context_fields.sql

-- Remover campos de contexto e dados da IA (se existirem)
ALTER TABLE configuracoes DROP COLUMN IF EXISTS contexto_ia;
ALTER TABLE configuracoes DROP COLUMN IF EXISTS dados_ia;

-- Remover campos de API keys (se existirem)
ALTER TABLE configuracoes DROP COLUMN IF EXISTS groq_api_key;
ALTER TABLE configuracoes DROP COLUMN IF EXISTS zapi_instance_id;
ALTER TABLE configuracoes DROP COLUMN IF EXISTS zapi_token;
ALTER TABLE configuracoes DROP COLUMN IF EXISTS zapi_client_token;

-- Remover campos de controle de status (agora baseados em variáveis de ambiente)
ALTER TABLE configuracoes DROP COLUMN IF EXISTS ai_enabled;
ALTER TABLE configuracoes DROP COLUMN IF EXISTS whatsapp_agent_enabled;

-- Confirmar estrutura final da tabela
\d configuracoes; 