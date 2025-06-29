-- Adiciona coluna memoria_context à tabela conversations (idempotente)
ALTER TABLE IF EXISTS conversations
ADD COLUMN IF NOT EXISTS memoria_context TEXT; 