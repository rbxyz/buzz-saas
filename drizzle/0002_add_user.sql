-- Criar usuário completamente novo com o hash que o sistema está gerando

-- Remover usuário problemático
DELETE FROM users WHERE email = 'admin@buzz.com';

-- Inserir com o hash correto que o sistema está gerando
INSERT INTO users (
    id,
    name,
    email,
    login,
    password,
    role,
    phone,
    active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Administrador Principal',
    'admin@buzz.com',
    'admin',
    '$2b$12$A7rcsNG61N7pP55vOJzVg.VNNtg4uOr5wrMcqYBfwJjhA0c/R7POm', -- Hash do sistema
    'superadmin',
    '(11) 99999-9999',
    true,
    NOW(),
    NOW()
);

-- Verificar criação
SELECT 
    'Usuário criado com hash do sistema!' as status,
    email,
    name,
    role,
    active,
    substring(password, 1, 30) || '...' as hash_preview
FROM users 
WHERE email = 'admin@buzz.com';
