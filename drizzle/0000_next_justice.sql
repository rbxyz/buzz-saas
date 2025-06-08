CREATE TYPE "public"."conversation_status" AS ENUM('ativa', 'encerrada', 'pausada');--> statement-breakpoint
CREATE TYPE "public"."dias_semana" AS ENUM('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo');--> statement-breakpoint
CREATE TYPE "public"."link_type_enum" AS ENUM('cliente', 'parceria');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('cliente', 'bot', 'atendente');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('texto', 'imagem', 'audio', 'documento');--> statement-breakpoint
CREATE TYPE "public"."turno_enum" AS ENUM('manha', 'tarde', 'noite');--> statement-breakpoint
CREATE TYPE "public"."valor_tipo_enum" AS ENUM('padrao', 'premium', 'personalizado');--> statement-breakpoint
CREATE TABLE "agendamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"data_hora" timestamp NOT NULL,
	"servico" text NOT NULL,
	"status" text NOT NULL,
	"valor_cobrado" numeric(10, 2),
	"duracao_minutos" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"modelo" varchar(50) DEFAULT 'groq/llama-3.1-8b-instant',
	"temperatura" real DEFAULT 0.7,
	"ativo" boolean DEFAULT true NOT NULL,
	"ultimo_treinamento" timestamp,
	"contador_consultas" integer DEFAULT 0 NOT NULL,
	"prompt_sistema" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"data_nascimento" date,
	"email" text,
	"telefone" varchar(20) NOT NULL,
	"compras_recentes" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"dias" "dias_semana"[] DEFAULT ARRAY['segunda','terca','quarta','quinta','sexta']::dias_semana[] NOT NULL,
	"hora_inicio" text DEFAULT '09:00' NOT NULL,
	"hora_fim" text DEFAULT '18:00' NOT NULL,
	"horarios_personalizados" json DEFAULT '[]'::jsonb NOT NULL,
	"instance_id" text DEFAULT '' NOT NULL,
	"token" text DEFAULT '' NOT NULL,
	"whatsapp_ativo" boolean DEFAULT false NOT NULL,
	"modo_treino_ativo" boolean DEFAULT false NOT NULL,
	"contexto_ia" text DEFAULT '' NOT NULL,
	"dados_ia" text DEFAULT '' NOT NULL,
	"servicos" json DEFAULT '[]' NOT NULL,
	"dias_antecedencia_agendamento" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid,
	"telefone" varchar(20) NOT NULL,
	"status" "conversation_status" DEFAULT 'ativa' NOT NULL,
	"ultima_mensagem" timestamp,
	"metadata" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" json NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "intervalos_trabalho" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dia_semana" "dias_semana" NOT NULL,
	"hora_inicio" text NOT NULL,
	"hora_fim" text NOT NULL,
	"turno" "turno_enum" NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"url" text,
	"descricao" text DEFAULT '',
	"cliente_id" uuid,
	"tipo" "link_type_enum" NOT NULL,
	"imagem" "bytea",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"remetente" "message_role" NOT NULL,
	"conteudo" text NOT NULL,
	"tipo" "message_type" DEFAULT 'texto' NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "relatorios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"payload" json,
	"gerado_em" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;

-- Inserir agente padrão se não existir
INSERT INTO "agents" ("nome", "descricao", "modelo", "temperatura", "ativo", "prompt_sistema")
SELECT 
    'Assistente de Agendamentos',
    'Assistente virtual especializado em agendamentos de barbearia',
    'groq/llama-3.1-8b-instant',
    0.7,
    true,
    'Você é um assistente virtual especializado em agendamentos para uma barbearia. Seja sempre cordial, profissional e eficiente. Ajude os clientes a agendar serviços, responda dúvidas sobre horários e serviços disponíveis. Quando um cliente quiser agendar, colete as seguintes informações: nome completo, serviço desejado, data preferida e horário. Confirme sempre os detalhes antes de finalizar o agendamento.'
WHERE NOT EXISTS (SELECT 1 FROM "agents" WHERE "nome" = 'Assistente de Agendamentos');

-- Inserir configuração padrão se não existir
INSERT INTO "configuracoes" ("nome", "telefone", "endereco", "servicos")
SELECT 
    'Barbearia Buzz',
    '(51) 99876-1413',
    'Rua Duque de Caxias, 950, Centro, Venâncio Aires',
    '[
        {"nome": "Corte de Cabelo", "preco": 25.00, "duracao": 30},
        {"nome": "Barba", "preco": 20.00, "duracao": 20},
        {"nome": "Sobrancelha", "preco": 10.00, "duracao": 15},
        {"nome": "Corte + Barba", "preco": 40.00, "duracao": 45}
    ]'::json
WHERE NOT EXISTS (SELECT 1 FROM "configuracoes");
