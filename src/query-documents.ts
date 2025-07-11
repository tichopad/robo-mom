import { distinctBy } from "@std/collections";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";
import { db } from "./db/client.ts";
import { notesTable } from "./db/schema.ts";
import { generateEmbedding } from "./embeddings.ts";

/**
 * Performs a semantic search on a database of loaded notes.
 *
 * @param query - The query to search for.
 * @returns A list of notes that match the query.
 */
export async function queryDocuments(query: string, limit = 10) {
	if (query.trim() === "") {
		throw new Error("Query is required");
	}

	const queryEmbedding = await generateEmbedding(query, "search_query");

	const filenameSimilarity = sql<number>`1 - (${cosineDistance(
		notesTable.filename_vector,
		queryEmbedding,
	)})`;
	const filenameResults = await db
		.select({
			id: notesTable.id,
			filename: notesTable.filename,
			chunk_index: notesTable.chunk_index,
			text: notesTable.text,
			frontmatter_attributes: notesTable.frontmatter_attributes,
			similarity: filenameSimilarity,
		})
		.from(notesTable)
		.where(gt(filenameSimilarity, 0.4))
		.orderBy((result) => desc(result.similarity))
		.limit(limit);

	const contentSimilarity = sql<number>`1 - (${cosineDistance(
		notesTable.text_vector,
		queryEmbedding,
	)})`;
	const contentResults = await db
		.select({
			id: notesTable.id,
			filename: notesTable.filename,
			chunk_index: notesTable.chunk_index,
			text: notesTable.text,
			frontmatter_attributes: notesTable.frontmatter_attributes,
			similarity: contentSimilarity,
		})
		.from(notesTable)
		.where(gt(contentSimilarity, 0.3))
		.orderBy((result) => desc(result.similarity))
		.limit(limit);

	const allResults = [...filenameResults, ...contentResults];

	const uniqueResults = distinctBy(allResults, (x) => x.id);

	return uniqueResults;
}
