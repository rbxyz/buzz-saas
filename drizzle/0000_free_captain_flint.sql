CREATE TYPE "public"."link_type_enum" AS ENUM('cliente', 'parceria');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system', 'bot');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('superadmin', 'admin');--> statement-breakpoint
CREATE TABLE "agendamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer DEFAULT 1 NOT NULL,
	"cliente_id" integer NOT NULL,
	"servico_id" integer,
	"servico" varchar(255) NOT NULL,
	"data_hora" timestamp with time zone NOT NULL,
	"duracao_minutos" integer DEFAULT 30 NOT NULL,
	"valor_cobrado" numeric(10, 2),
	"status" varchar(50) DEFAULT 'agendado' NOT NULL,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"modelo" varchar(50) DEFAULT 'groq/llama-3.1-8b-instant',
	"temperatura" real DEFAULT 0.7,
	"ativo" boolean DEFAULT true,
	"ultimo_treinamento" timestamp,
	"contador_consultas" integer DEFAULT 0,
	"prompt_sistema" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer DEFAULT 1 NOT NULL,
	"nome" varchar(255) NOT NULL,
	"telefone" varchar(20) NOT NULL,
	"email" varchar(255),
	"endereco" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "clientes_user_id_telefone_unique" UNIQUE("user_id","telefone")
);
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nome_empresa" varchar(255),
	"telefone" varchar(255),
	"endereco" text,
	"logo_url" text,
	"cor_primaria" varchar(255) DEFAULT '#3B82F6',
	"cor_secundaria" varchar(255) DEFAULT '#1E40AF',
	"zapi_instance_id" varchar(255),
	"zapi_token" varchar(255),
	"zapi_client_token" varchar(255),
	"ai_enabled" boolean DEFAULT false,
	"whatsapp_agent_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "configuracoes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"cliente_id" integer,
	"telefone" varchar(20) NOT NULL,
	"nome_contato" varchar(255),
	"ultima_mensagem" text,
	"ultima_interacao" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "conversations_user_id_telefone_unique" UNIQUE("user_id","telefone")
);
--> statement-breakpoint
CREATE TABLE "intervalos_trabalho" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dia_semana" integer NOT NULL,
	"hora_inicio" varchar(5) NOT NULL,
	"hora_fim" varchar(5) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "intervalos_trabalho_user_id_dia_semana_unique" UNIQUE("user_id","dia_semana")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"url" text,
	"descricao" text DEFAULT '',
	"cliente_id" uuid,
	"tipo" "link_type_enum" NOT NULL,
	"imagem" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"content" text NOT NULL,
	"role" "message_role" NOT NULL,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"message_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"preco" numeric(10, 2),
	"duracao" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"login" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" "user_role_enum" DEFAULT 'admin' NOT NULL,
	"phone" varchar(20),
	"active" boolean DEFAULT true NOT NULL,
	"can_delete" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_login" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_login_unique" UNIQUE("login")
);
--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervalos_trabalho" ADD CONSTRAINT "intervalos_trabalho_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agendamentos_user_idx" ON "agendamentos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agendamentos_cliente_idx" ON "agendamentos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "agendamentos_data_hora_idx" ON "agendamentos" USING btree ("data_hora");--> statement-breakpoint
CREATE INDEX "agendamentos_status_idx" ON "agendamentos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "clientes_user_idx" ON "clientes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clientes_telefone_idx" ON "clientes" USING btree ("telefone");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_telefone_idx" ON "conversations" USING btree ("telefone");--> statement-breakpoint
CREATE INDEX "conversations_ultima_interacao_idx" ON "conversations" USING btree ("ultima_interacao");--> statement-breakpoint
CREATE INDEX "conversations_ativa_idx" ON "conversations" USING btree ("ativa");--> statement-breakpoint
CREATE INDEX "intervalos_user_idx" ON "intervalos_trabalho" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_timestamp_idx" ON "messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "messages_role_idx" ON "messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "messages_message_id_idx" ON "messages" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "servicos_user_idx" ON "servicos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "servicos_ativo_idx" ON "servicos" USING btree ("ativo");