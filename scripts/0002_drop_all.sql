-- Script para limpar completamente o banco de dados (versão sem privilégios especiais)
-- ATENÇÃO: Este script irá apagar TODOS os dados!

-- Dropar todas as tabelas em ordem específica (respeitando dependências de FK)

-- 1. Primeiro, dropar tabelas que referenciam outras (filhas)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS agendamentos CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS intervalos_trabalho CASCADE;
DROP TABLE IF EXISTS servicos CASCADE;
DROP TABLE IF EXISTS links CASCADE;

-- 2. Depois, dropar tabelas que são referenciadas (pais)
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS configuracoes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Dropar tabelas independentes
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS relatorios CASCADE;
DROP TABLE IF EXISTS "buzze-saas_users" CASCADE;

-- 4. Dropar tabelas do Drizzle
DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE;

-- 5. Dropar todos os tipos ENUM (em ordem reversa de dependência)
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS message_role CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS conversation_status CASCADE;
DROP TYPE IF EXISTS link_type_enum CASCADE;
DROP TYPE IF EXISTS dias_semana CASCADE;
DROP TYPE IF EXISTS turno_enum CASCADE;
DROP TYPE IF EXISTS valor_tipo_enum CASCADE;

-- 6. Dropar schema do Drizzle se existir
DROP SCHEMA IF EXISTS drizzle CASCADE;

-- 7. Verificar se ainda existem tabelas no schema public
SELECT 
    'Tabelas restantes:' as info,
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 8. Verificar se ainda existem tipos personalizados
SELECT 
    'Tipos restantes:' as info,
    n.nspname as schema_name,
    t.typname as type_name
FROM pg_type t 
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid)) 
AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
AND n.nspname = 'public'
AND t.typname NOT LIKE 'pg_%'
ORDER BY type_name;

-- 9. Mensagem de confirmação
SELECT 'Banco de dados limpo com sucesso!' as status;
