-- Inserir planos iniciais (Starter e Pro)

-- Plano Starter
INSERT INTO plans (name, type, price, features, limits, is_active, created_at, updated_at)
VALUES (
  'Starter',
  'starter',
  29.90,
  '["Até 30 agendamentos por mês", "Análise de desempenho básica", "Métricas básicas", "Agendamentos recentes", "Gestão de clientes", "Serviços ilimitados"]'::jsonb,
  '{"monthlyBookings": 30, "maxUsers": 1, "whatsappIntegration": false, "advancedAnalytics": false, "customTheme": false}'::jsonb,
  true,
  NOW(),
  NOW()
) ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- Plano Pro
INSERT INTO plans (name, type, price, features, limits, is_active, created_at, updated_at)
VALUES (
  'Pro',
  'pro',
  79.90,
  '["Agendamentos ilimitados", "Integração WhatsApp", "Análises aprofundadas", "Métricas de crescimento", "Relatórios avançados", "Configuração de tema", "Gerenciamento de usuários", "Usuários ilimitados", "Suporte prioritário", "Backup automático"]'::jsonb,
  '{"monthlyBookings": -1, "maxUsers": -1, "whatsappIntegration": true, "advancedAnalytics": true, "customTheme": true}'::jsonb,
  true,
  NOW(),
  NOW()
) ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- Criar um índice único no tipo do plano para evitar duplicatas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'plans_type_unique_idx') THEN
    CREATE UNIQUE INDEX plans_type_unique_idx ON plans(type);
  END IF;
END$$; 