import { tool } from "ai";
import z from "zod";
import { logger } from "#src/logger/logger.ts";
import { queryDocuments } from "#src/query-notes/query-documents.ts";

type SearchNotesToolOptions = {
	onDebugInfo?: (info: string) => void;
};

/**
 * Creates a tool that allows the LLM to search the user's notes about a given query using a vector search.
 */
export function createSearchNotesTool({ onDebugInfo }: SearchNotesToolOptions) {
	return tool({
		description:
			"Search the user's notes about a given query using a vector search. Returns the most relevant notes in a structured format." +
			"The format is: <file-<index>> <filename> <content> <frontmatter> </file-<index>>",
		parameters: z.object({
			query: z.string().describe("The query to search for."),
		}),
		execute: async ({ query }) => {
			// TODO: include requestId
			logger.info("Tool searchNotes initiated", {
				toolName: "searchNotes",
				query,
			});

			onDebugInfo?.(`Searching notes for query: ${query}`);

			const documents = await queryDocuments(query, 8);
			onDebugInfo?.(`Found ${documents.length} documents`);

			logger.debug("Tool searchNotes completed", {
				toolName: "searchNotes",
				query,
				documentsFound: documents.length,
				documents,
			});

			return documents.map(
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
