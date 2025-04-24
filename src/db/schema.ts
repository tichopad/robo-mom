import { integer, json, pgTable, text, vector } from "drizzle-orm/pg-core";

/**
 * Notes table schema
 *
 * Contains all the notes in the user's knowledge base
 */
export const notesTable = pgTable("notes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  filename: text().notNull(),
  chunk_index: integer().notNull(),
  text: text().notNull(),
  text_vector: vector({ dimensions: 768 }),
  filename_vector: vector({ dimensions: 768 }),
  // Frontmatter metadata parsed from each Markdown file
  frontmatter_attributes: json("frontmatter_attributes").$type<FrontmatterAttributes>(),
});

type FrontmatterAttributes = {
  tags?: string[] | undefined;
  [otherKeys: string]: unknown;
}

export type Note = typeof notesTable.$inferSelect;
export type NewNote = typeof notesTable.$inferInsert;
