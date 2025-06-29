import { defineCommand, runMain } from "citty";
import { logger } from "./logger.ts";
import { queryDocuments } from "./query-documents.ts";

const main = defineCommand({
	meta: {
		name: "rag-cli",
		version: "1.0.0",
		description: "CLI for testing RAG vector search functionality",
	},
	args: {
		query: {
			type: "positional",
			description: "The search query to execute",
			required: true,
		},
		limit: {
			type: "string",
			description: "Maximum number of results to display",
			alias: "l",
			default: "10",
		},
		verbose: {
			type: "boolean",
			description: "Show detailed information including similarity scores",
			alias: "v",
			default: false,
		},
	},
		async run({ args }) {
		const query = args.query as string;
		const limit = Number.parseInt(args.limit as string, 10) || 10;

		if (!query || query.trim() === "") {
			logger.error("Query cannot be empty");
			process.exit(1);
		}

		try {
			logger.info(`Searching for: "${query}"`);
			const start = performance.now();

			const results = await queryDocuments(query);

			const end = performance.now();
			const executionTime = (end - start).toFixed(2);

			logger.info(`Found ${results.length} results in ${executionTime}ms`);

			if (results.length === 0) {
				console.log("\nNo results found.");
				return;
			}

			// Limit results if specified
			const displayResults = results.slice(0, limit);

			console.log(`\n${"=".repeat(80)}`);
			console.log("SEARCH RESULTS");
			console.log("=".repeat(80));

			for (const [index, result] of displayResults.entries()) {
				console.log(`\n--- Result ${index + 1} ---`);
				console.log(`File: ${result.filename}`);

				if (result.chunk_index !== null) {
					console.log(`Chunk: ${result.chunk_index}`);
				}

				if (args.verbose) {
					console.log(`Similarity: ${result.similarity.toFixed(4)}`);

					if (result.frontmatter_attributes) {
						console.log(`Frontmatter: ${JSON.stringify(result.frontmatter_attributes, null, 2)}`);
					}
				}

				console.log("\nContent:");
				console.log(`${"-".repeat(40)}`);

				// Truncate very long content for better readability
				const content = result.text;
				const maxLength = args.verbose ? 1000 : 300;

				if (content.length > maxLength) {
					console.log(`${content.substring(0, maxLength)}...`);
				} else {
					console.log(content);
				}

				if (index < displayResults.length - 1) {
					console.log(`\n${"-".repeat(80)}`);
				}
			}

			if (results.length > limit) {
				console.log(`\n... and ${results.length - limit} more results`);
				console.log("Use --limit to see more results");
			}

		} catch (error) {
			if (error instanceof Error) {
				logger.error(`Error executing search: ${error.message}`);
			} else {
				logger.error("Unknown error occurred during search");
			}
			process.exit(1);
		}
	},
});

runMain(main);
