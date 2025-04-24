CREATE TABLE "notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"filename" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"text_vector" vector(768),
	"filename_vector" vector(768),
	"frontmatter_attributes" json
);
