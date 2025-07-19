import { tool } from "ai";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#src/db/client.ts";
import { notesTable } from "#src/db/schema.ts";
import { logger } from "#src/logger/logger.ts";

type AboutAuthorToolOptions = {
	onDebugInfo?: (info: string) => void;
};

/**
 * Basic information about the user making the query (author of the notes).
 * More detailed information can be found by searching the notes using the searchNotes tool.
 * Searches for notes with the "about-me" tag in the frontmatter attributes.
 * @returns Basic information about the user making the query (author of the notes).
 */
export function createAboutAuthorTool({ onDebugInfo }: AboutAuthorToolOptions) {
	return tool({
		description:
			"Basic information about the user making the query (author of the notes)." +
			"More detailed information can be found by searching the notes using the searchNotes tool.",
		parameters: z.object({
			limit: z
				.number()
				.optional()
				.describe(
					"The maximum number of notes describing the author to return.",
				),
		}),
		execute: async ({ limit = 10 }) => {
			// TODO: include requestId
			logger.info("Tool aboutAuthor initiated", {
				toolName: "aboutAuthor",
				requestedLimit: limit,
			});

			onDebugInfo?.(
				`Searching for notes with the "about-me" tag in the frontmatter attributes.`,
			);

			// Search for notes with the "about-me" tag in the frontmatter attributes.
			const result = await db.query.notesTable.findMany({
				where: sql`
          ${notesTable.frontmatter_attributes} IS NOT NULL
          AND ${notesTable.frontmatter_attributes}->'tags' IS NOT NULL
          AND (${notesTable.frontmatter_attributes}->'tags')::jsonb @> '["about-me"]'`,
				limit,
				columns: {
					id: true,
					filename: true,
					chunk_index: true,
					frontmatter_attributes: true,
					text: true,
				},
			});

			logger.debug("Tool aboutAuthor completed", {
				toolName: "aboutAuthor",
				requestedLimit: limit,
				returnedInfo: result,
			});

			return result.map(
				(doc, i) => `
          <file-${i}>
            <path>${doc.filename}</path>
            <content>${doc.text}</content>
            <meta>${JSON.stringify(doc.frontmatter_attributes)}</meta>
          </file-${i}>
        `,
			);
		},
	});
}
