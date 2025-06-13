-- Primeiro, vamos verificar se já existem usuários
SELECT 'Usuários existentes:' as info;
SELECT id, name, email, login, role, active FROM users;

-- Inserir um usuário padrão se não existir
INSERT INTO users (
    name, 
    email, 
    login, 
    password, 
    role, 
    phone, 
    active, 
    can_delete,
    created_at,
    updated_at
) VALUES (
    'Administrador Principal',
    'admin@buzz.com',
    'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
    'admin',
    '(51) 99999-9999',
    true,
    false, -- não pode ser deletado
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (login) DO NOTHING; -- Não inserir se já existir

-- Verificar se o usuário foi criado
SELECT 'Usuário criado/existente:' as info;
SELECT id, name, email, login, role, active FROM users WHERE login = 'admin';

-- Agora vamos definir o valor padrão para user_id na tabela clientes
-- usando o ID do usuário que acabamos de criar
DO $$
DECLARE
    admin_user_id INTEGER;
BEGIN
    -- Buscar o ID do usuário admin
    SELECT id INTO admin_user_id FROM users WHERE login = 'admin' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Definir o valor padrão para a coluna user_id
        EXECUTE format('ALTER TABLE clientes ALTER COLUMN user_id SET DEFAULT %s', admin_user_id);
        RAISE NOTICE 'Valor padrão definido para user_id: %', admin_user_id;
    ELSE
        RAISE EXCEPTION 'Usuário admin não encontrado!';
    END IF;
END $$;

-- Verificar a estrutura da tabela clientes
SELECT 'Estrutura da tabela clientes:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;

-- Testar inserção de um cliente
INSERT INTO clientes (nome, telefone, email) 
VALUES ('Cliente Teste', '(51) 98765-4321', 'teste@cliente.com')
ON CONFLICT (user_id, telefone) DO NOTHING;

-- Verificar se o cliente foi inserido
SELECT 'Cliente de teste inserido:' as info;
SELECT id, user_id, nome, telefone, email FROM clientes WHERE nome = 'Cliente Teste';

SELECT 'Script executado com sucesso!' as resultado;
