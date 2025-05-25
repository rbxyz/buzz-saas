CREATE TYPE "public"."dias_semana" AS ENUM('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo');--> statement-breakpoint
ALTER TABLE "configuracoes" ALTER COLUMN "dias" SET DATA TYPE dias_semana[];--> statement-breakpoint
ALTER TABLE "configuracoes" ALTER COLUMN "dias" SET DEFAULT ARRAY['segunda','terca','quarta','quinta','sexta']::dias_semana[];