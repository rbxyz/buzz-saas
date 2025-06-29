-- Renomeia a coluna existente de camelCase para snake_case, se existir.
ALTER TABLE IF EXISTS conversations RENAME COLUMN "memoriaContext" TO memoria_contexto;

-- Altera o tipo da coluna para JSONB, convertendo os dados existentes.
ALTER TABLE conversations ALTER COLUMN memoria_contexto TYPE JSONB USING memoria_contexto::jsonb;

-- Define um valor padrão para a coluna, garantindo que novas conversas tenham um estado inicial.
ALTER TABLE conversations ALTER COLUMN memoria_contexto SET DEFAULT '{}'::jsonb; 