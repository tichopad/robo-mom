import { tool } from "ai";
import { z } from "zod";
import { logger } from "#src/logger.ts";
import { executeRipgrepSearch as ripgrepSearch } from "#src/query-notes/ripgrep.ts";

type RipgrepFilesToolParams = {
	onDebugInfo: (info: string) => void;
};

/**
 * Creates a tool that allows the LLM to search the user's notes using ripgrep patterns.
 */
export function createRipgrepFilesTool({
	onDebugInfo,
}: RipgrepFilesToolParams) {
	return tool({
		description:
			"Search files in the notes directory using ripgrep patterns. " +
			"Use this for powerful text search capabilities with regex support. " +
			"Returns matching lines with file paths and line numbers. " +
			"Use maxResults to limit output and avoid rate limits.",
		parameters: z.object({
			pattern: z
				.string()
				.describe("The ripgrep pattern to search for (supports regex)"),
			flags: z
				.array(z.string())
				.optional()
				.describe(
					"Additional ripgrep flags (e.g., ['-i'] for case-insensitive, ['-w'] for word boundaries)",
				),
			maxResults: z
				.number()
				.optional()
				.describe(
					"Maximum number of results to return (default: 10, use lower values to avoid rate limits)",
				),
		}),
		execute: async ({ pattern, flags = [], maxResults = 10 }) => {
			// TODO: include requestId
			logger.info("Tool grepFiles initiated", {
				toolName: "grepFiles",
				pattern,
				flags,
				maxResults,
			});

			onDebugInfo(
				`Tool grepFiles initiated: pattern=${pattern}, flags=${flags}, maxResults=${maxResults}`,
			);

			const result = await ripgrepSearch({
				pattern,
				flags,
				maxResults,
			});

			onDebugInfo(
				`Tool grepFiles completed, totalMatchesFound=${result.totalMatches}`,
			);

			logger.debug("Tool grepFiles completed", {
				toolName: "grepFiles",
				pattern,
				flags,
				maxResults,
				totalMatchesFound: result.totalMatches,
				limited: result.limited,
			});

			return result.results;
		},
	});
}
