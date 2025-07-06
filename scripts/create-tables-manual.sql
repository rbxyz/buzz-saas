-- Criar enums apenas se não existirem
DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_type_enum AS ENUM('starter', 'pro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status_enum AS ENUM('active', 'inactive', 'cancelled', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela plans se não existir
CREATE TABLE IF NOT EXISTS plans (
    id serial PRIMARY KEY,
    name varchar(255) NOT NULL,
    type plan_type_enum NOT NULL,
    price numeric(10, 2) NOT NULL,
    features jsonb NOT NULL,
    limits jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Criar índice único no tipo se não existir
DO $$
BEGIN
    CREATE UNIQUE INDEX plans_type_unique_idx ON plans(type);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Criar tabela subscriptions se não existir
CREATE TABLE IF NOT EXISTS subscriptions (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    plan_id integer NOT NULL,
    status subscription_status_enum DEFAULT 'active' NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    auto_renew boolean DEFAULT true NOT NULL,
    mercado_pago_preference_id varchar(255),
    mercado_pago_subscription_id varchar(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Criar tabela payments se não existir
CREATE TABLE IF NOT EXISTS payments (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    subscription_id integer NOT NULL,
    amount numeric(10, 2) NOT NULL,
    currency varchar(3) DEFAULT 'BRL' NOT NULL,
    status payment_status_enum DEFAULT 'pending' NOT NULL,
    mercado_pago_payment_id varchar(255),
    mercado_pago_status varchar(50),
    payment_method varchar(50),
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Criar tabela mercado_pago_config se não existir
CREATE TABLE IF NOT EXISTS mercado_pago_config (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    public_key varchar(255),
    access_token text,
    webhook_url varchar(500),
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Adicionar constraints apenas se não existirem
DO $$
BEGIN
    -- Foreign keys para subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_users_id_fk') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_id_plans_id_fk') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_plans_id_fk 
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE cascade;
    END IF;

    -- Foreign keys para payments
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_user_id_users_id_fk') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_subscription_id_subscriptions_id_fk') THEN
        ALTER TABLE payments ADD CONSTRAINT payments_subscription_id_subscriptions_id_fk 
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE cascade;
    END IF;

    -- Foreign key para mercado_pago_config
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mercado_pago_config_user_id_users_id_fk') THEN
        ALTER TABLE mercado_pago_config ADD CONSTRAINT mercado_pago_config_user_id_users_id_fk 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade;
    END IF;

    -- Unique constraint para mercado_pago_config
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mercado_pago_config_user_id_unique') THEN
        ALTER TABLE mercado_pago_config ADD CONSTRAINT mercado_pago_config_user_id_unique UNIQUE(user_id);
    END IF;
END $$;

-- Criar índices apenas se não existirem
DO $$
BEGIN
    -- Índices para subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'subscriptions_user_idx') THEN
        CREATE INDEX subscriptions_user_idx ON subscriptions(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'subscriptions_status_idx') THEN
        CREATE INDEX subscriptions_status_idx ON subscriptions(status);
    END IF;

    -- Índices para payments
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_user_idx') THEN
        CREATE INDEX payments_user_idx ON payments(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_subscription_idx') THEN
        CREATE INDEX payments_subscription_idx ON payments(subscription_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_status_idx') THEN
        CREATE INDEX payments_status_idx ON payments(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payments_mp_payment_idx') THEN
        CREATE INDEX payments_mp_payment_idx ON payments(mercado_pago_payment_id);
    END IF;
END $$; 