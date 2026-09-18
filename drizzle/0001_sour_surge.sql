ALTER TABLE "events" ADD COLUMN "synthetic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "synthetic" boolean DEFAULT false NOT NULL;