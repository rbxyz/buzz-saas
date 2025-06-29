ALTER TABLE "conversations" ADD COLUMN "memoria_context" text;--> statement-breakpoint
ALTER TABLE "configuracoes" DROP COLUMN "zapi_instance_id";--> statement-breakpoint
ALTER TABLE "configuracoes" DROP COLUMN "zapi_token";--> statement-breakpoint
ALTER TABLE "configuracoes" DROP COLUMN "zapi_client_token";--> statement-breakpoint
ALTER TABLE "configuracoes" DROP COLUMN "ai_enabled";--> statement-breakpoint
ALTER TABLE "configuracoes" DROP COLUMN "whatsapp_agent_enabled";