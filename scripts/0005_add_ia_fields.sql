-- Adicionar campos de IA na tabela configuracoes
ALTER TABLE configuracoes 
ADD COLUMN groq_api_key VARCHAR(255),
ADD COLUMN contexto_ia TEXT,
ADD COLUMN dados_ia TEXT; 