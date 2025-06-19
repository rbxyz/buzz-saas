-- Este script insere dois usuários iniciais no sistema: um Super Admin e um Admin.
--
-- IMPORTANTE: As senhas estão salvas como texto plano. Em um ambiente de produção real,
-- é crucial que você armazene senhas com hash para garantir a segurança.

INSERT INTO "users" ("name", "email", "login", "password", "role") VALUES
('Super Admin', 'superadmin@buzz.com', 'superadmin', 'super_secret_password_123', 'superadmin'),
('Admin', 'admin@buzz.com', 'admin', 'admin_secret_password_123', 'admin');

-- Verifica se os usuários foram inseridos corretamente
SELECT * FROM "users";  