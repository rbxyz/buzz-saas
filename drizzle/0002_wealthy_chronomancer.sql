CREATE TYPE "public"."conversation_status" AS ENUM('ativa', 'encerrada', 'pausada');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('cliente', 'bot', 'atendente');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('texto', 'imagem', 'audio', 'documento');--> statement-breakpoint
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
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;