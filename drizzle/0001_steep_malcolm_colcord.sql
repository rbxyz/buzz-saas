CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'superadmin');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"login" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "user_role_enum" NOT NULL,
	"phone" varchar(20),
	"active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_login_unique" UNIQUE("login")
);
