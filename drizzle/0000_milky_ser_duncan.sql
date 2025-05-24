--CREATE TYPE "public"."link_type_enum" AS ENUM('cliente', 'parceria');--> statement-breakpoint
--CREATE TYPE "public"."valor_tipo_enum" AS ENUM('padrao', 'premium', 'personalizado');--> statement-breakpoint
CREATE TABLE "agendamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"data_hora" timestamp NOT NULL,
	"servico" text NOT NULL,
	"status" text NOT NULL,
	"valor_cobrado" numeric(10, 2),
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
	"dias" text DEFAULT '' NOT NULL,
	"hora_inicio" text DEFAULT '09:00' NOT NULL,
	"hora_fim" text DEFAULT '18:00' NOT NULL,
	"instance_id" text DEFAULT '' NOT NULL,
	"token" text DEFAULT '' NOT NULL,
	"whatsapp_ativo" boolean DEFAULT false NOT NULL,
	"modo_treino_ativo" boolean DEFAULT false NOT NULL,
	"contexto_ia" text DEFAULT '' NOT NULL,
	"dados_ia" text DEFAULT '' NOT NULL,
	"servicos" json DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"url" text NOT NULL,
	"descricao" text DEFAULT '',
	"cliente_id" uuid,
	"tipo" "link_type_enum" NOT NULL,
	"imagem" "bytea",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
ALTER TABLE "links" ADD CONSTRAINT "links_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;