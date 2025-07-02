ALTER TYPE "public"."message_role" ADD VALUE 'tool';--> statement-breakpoint
ALTER TABLE "conversations" RENAME COLUMN "memoria_contexto" TO "memoria_context";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "raw" jsonb;