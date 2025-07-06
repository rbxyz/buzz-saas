ALTER TABLE "mercado_pago_config" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "mercado_pago_config" CASCADE;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "type" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "features" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "mercado_pago_plan_id" varchar(255);--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "limits";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "is_active";