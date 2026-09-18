CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stage" text DEFAULT 'greeting' NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"lang" text DEFAULT 'bn' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
