ALTER TABLE "subscriptions" ADD COLUMN "stripe_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_customer_id" varchar(255);