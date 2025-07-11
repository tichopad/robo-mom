/**
 * @fileoverview Command-line interface for testing ripgrep search functionality
 *
 * This CLI tool provides a convenient way to test and debug ripgrep searches
 * through the user's notes directory. It offers both simple and advanced search
 * capabilities with various configuration options.
 *
 * Features:
 * - Pattern-based search with regex support
 * - Configurable ripgrep flags for advanced search options
 * - Result limiting to prevent overwhelming output
 * - Verbose mode for debugging and performance analysis
 * - Comprehensive error handling and user feedback
 *
 * Usage Examples:
 * ```bash
 * # Basic search
 * pnpm run ripgrep:cli "TODO"
 *
 * # Case-insensitive search
 * pnpm run ripgrep:cli "todo" --flags "-i"
 *
 * # Word boundary search with limit
 * pnpm run ripgrep:cli "test" --flags "-w" --limit 10
 *
 * # Verbose mode with multiple flags
 * pnpm run ripgrep:cli "error" --flags "-i,-w" --limit 5 --verbose
 * ```
 *
 * @author robo-mom development team
 * @version 1.0.0
 */

import { defineCommand, runMain } from "citty";
import { logger } from "../logger.ts";
import { print } from "../print.ts";
import { executeRipgrepSearch } from "../ripgrep.ts";

/**
 * Main CLI command definition for ripgrep testing
 *
 * This command provides a comprehensive interface for testing ripgrep searches
 * with various configuration options. It follows the citty pattern used by other
 * CLI tools in the project.
 */
const main = defineCommand({
	meta: {
		name: "ripgrep-cli",
		version: "1.0.0",
		description: "CLI for testing ripgrep search functionality",
	},
	args: {
		/**
		 * The ripgrep pattern to search for (supports regex)
		 *
		 * This is a positional argument that must be provided. It supports
		 * all ripgrep pattern syntax including regular expressions.
		 *
		 * Examples:
		 * - "TODO" - Simple text search
		 * - "\\b\\w+\\b" - Word boundary regex
		 * - "error|warning" - OR pattern
		 */
		pattern: {
			type: "positional",
			description: "The ripgrep pattern to search for (supports regex)",
			required: true,
		},
		/**
		 * Additional ripgrep flags for advanced search options
		 *
		 * Flags are provided as a comma-separated string and are passed
		 * directly to ripgrep. Common flags include:
		 * - "-i": Case-insensitive search
		 * - "-w": Word boundary search
		 * - "-v": Invert match (exclude matches)
		 * - "-n": Show line numbers (already enabled by default)
		 *
		 * @example "--flags '-i,-w'" for case-insensitive word boundary search
		 */
		flags: {
			type: "string",
			description:
				"Additional ripgrep flags (comma-separated, e.g., '-i,-w' for case-insensitive and word boundaries)",
			alias: "f",
			default: "",
		},
		/**
		 * Maximum number of results to display
		 *
		 * This helps prevent overwhelming output when searching through
		 * large note collections. The default is 50, but can be adjusted
		 * based on the search context and user preferences.
		 */
		limit: {
			type: "string",
			description: "Maximum number of results to display",
			alias: "l",
			default: "50",
		},
		/**
		 * Enable verbose output for debugging and analysis
		 *
		 * When enabled, provides additional information including:
		 * - Execution time in milliseconds
		 * - Total number of matches found
		 * - Whether results were limited
		 * - Detailed error information if available
		 */
		verbose: {
			type: "boolean",
			description:
				"Show detailed information including execution time and match counts",
			alias: "v",
			default: false,
		},
	},
	/**
	 * Main execution function for the ripgrep CLI
	 *
	 * This function handles argument parsing, validation, search execution,
	 * and result formatting. It provides comprehensive error handling and
	 * user feedback throughout the process.
	 *
	 * @param args - Parsed command-line arguments
	 */
	async run({ args }) {
		// Extract and validate command-line arguments
		const pattern = args.pattern as string;
		const flagsString = args.flags as string;
		const limit = Number.parseInt(args.limit as string, 10) || 50;

		// Validate that pattern is provided and not empty
		if (!pattern || pattern.trim() === "") {
			logger.error("Pattern cannot be empty");
			process.exit(1);
		}

		/**
		 * Parse flags from comma-separated string
		 *
		 * This converts the user-provided flag string into an array
		 * of individual flags that can be passed to ripgrep.
		 *
		 * Example: "-i,-w" becomes ["-i", "-w"]
		 */
		const flags = flagsString
			.split(",")
			.map((flag) => flag.trim())
			.filter((flag) => flag.length > 0);

		try {
			// Display search configuration to user
			print.info(`Searching for pattern: "${pattern}"`);
			if (flags.length > 0) {
				print.info(`Using flags: ${flags.join(", ")}`);
			}
			print.info(`Result limit: ${limit}`);

			// Execute the ripgrep search with timing
			const start = performance.now();

			const result = await executeRipgrepSearch({
				pattern,
				flags,
				maxResults: limit,
			});

			const end = performance.now();
			const executionTime = (end - start).toFixed(2);

			// Display verbose information if requested
			if (args.verbose) {
				print.info(`Execution time: ${executionTime}ms`);
				print.info(`Total matches found: ${result.totalMatches}`);
				print.info(`Results limited: ${result.limited}`);
			}

			/**
			 * Handle empty results gracefully
			 *
			 * Check for both empty results array and the special "No matches found"
			 * message that ripgrep returns when no matches are found.
			 */
			if (
				result.results.length === 0 ||
				(result.results.length === 1 &&
					result.results[0] === "No matches found")
			) {
				console.log("\nNo matches found.");
				return;
			}

			/**
			 * Display search results with formatting
			 *
			 * Results are displayed with clear separators and numbering
			 * to make them easy to read and understand.
			 */
			console.log(`\n${"=".repeat(80)}`);
			console.log("RIPGREP SEARCH RESULTS");
			console.log("=".repeat(80));

			for (const [index, match] of result.results.entries()) {
				/**
				 * Handle the "more results" message specially
				 *
				 * This message is added by the ripgrep module when results
				 * are limited. We display it at the end without numbering.
				 */
				if (match.startsWith("... and ") && match.includes(" more results")) {
					console.log(`\n${match}`);
					break;
				}

				console.log(`\n--- Match ${index + 1} ---`);
				console.log(match);

				// Add separator between matches (except for the last one)
				if (index < result.results.length - 1) {
					console.log(`\n${"-".repeat(80)}`);
				}
			}

			/**
			 * Display additional results information if limited
			 *
			 * If results were limited but the "more results" message wasn't
			 * included in the results array, we add it manually.
			 */
			if (
				result.limited &&
				!result.results.some((r) => r.startsWith("... and "))
			) {
				console.log(
					`\n... and ${result.totalMatches - result.results.length} more results`,
				);
				console.log("Use --limit to see more results");
			}
		} catch (error) {
			/**
			 * Comprehensive error handling
			 *
			 * Log the error with appropriate context and provide
			 * a user-friendly error message before exiting.
			 */
			if (error instanceof Error) {
				logger.error(`Error executing ripgrep search: ${error.message}`);
			} else {
				logger.error("Unknown error occurred during ripgrep search");
			}
			process.exit(1);
		}
	},
});

/**
 * Start the CLI application
 *
 * This uses the citty framework to parse command-line arguments and
 * execute the main function with the parsed arguments.
 */
runMain(main);
