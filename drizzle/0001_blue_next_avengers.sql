CREATE TABLE "conversations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" text DEFAULT 'now()' NOT NULL,
	"ended_at" text,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" text NOT NULL,
	"message_index" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text DEFAULT 'now()' NOT NULL,
	"request_id" text,
	"input_prompt" text,
	"tools_used" json,
	"model_config" json,
	"sdk_config" json,
	"tokens_used" json,
	"timing_data" json,
	CONSTRAINT "messages_conversation_id_message_index_unique" UNIQUE("conversation_id","message_index")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"text_vector" vector(768),
	"filename_vector" vector(768),
	"checksum" text NOT NULL,
	"frontmatter_attributes" json
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;