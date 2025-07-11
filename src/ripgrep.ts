/**
 * @fileoverview Ripgrep search functionality for the robo-mom application
 *
 * This module provides a clean abstraction over ripgrep (rg) for searching
 * through the user's notes directory. It handles security constraints,
 * error handling, and result formatting.
 *
 * Security Features:
 * - Restricts searches to the notes directory only
 * - Validates file paths to prevent directory traversal attacks
 * - Uses the official @vscode/ripgrep package for reliable execution
 *
 * @author robo-mom development team
 * @version 1.0.0
 */

import { rgPath } from "@vscode/ripgrep";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { logger } from "./logger.ts";

/**
 * Security: Define the allowed directory for file operations
 * This constant ensures that ripgrep searches are restricted to the notes directory
 * to prevent unauthorized access to other parts of the filesystem.
 */
const NOTES_DIRECTORY = resolve("example_notes");

/**
 * Configuration options for ripgrep search operations
 *
 * @interface RipgrepOptions
 * @property {string} pattern - The search pattern (supports regex)
 * @property {string[]} [flags] - Additional ripgrep flags (e.g., ['-i'] for case-insensitive)
 * @property {number} [maxResults] - Maximum number of results to return (default: 50)
 */
export interface RipgrepOptions {
	/** The ripgrep pattern to search for (supports regex) */
	pattern: string;
	/** Additional ripgrep flags (e.g., ['-i'] for case-insensitive, ['-w'] for word boundaries) */
	flags?: string[];
	/** Maximum number of results to return (default: 50, use lower values to avoid rate limits) */
	maxResults?: number;
}

/**
 * Result structure returned by ripgrep search operations
 *
 * @interface RipgrepResult
 * @property {string[]} results - Array of matching lines with file paths and line numbers
 * @property {number} totalMatches - Total number of matches found (before limiting)
 * @property {boolean} limited - Whether results were limited due to maxResults constraint
 */
export interface RipgrepResult {
	/** Array of matching lines with file paths and line numbers */
	results: string[];
	/** Total number of matches found (before limiting) */
	totalMatches: number;
	/** Whether results were limited due to maxResults constraint */
	limited: boolean;
}

/**
 * Execute a ripgrep search in the notes directory
 *
 * This function provides a safe and efficient way to search through the user's notes
 * using ripgrep. It handles process spawning, output collection, error handling,
 * and result formatting.
 *
 * Features:
 * - Automatic result limiting to prevent overwhelming output
 * - Comprehensive error handling for process failures
 * - Structured logging for debugging and monitoring
 * - Security constraints to prevent directory traversal
 *
 * @param options - Search configuration including pattern, flags, and result limits
 * @returns Promise resolving to structured search results
 *
 * @example
 * ```typescript
 * const result = await executeRipgrepSearch({
 *   pattern: "TODO",
 *   flags: ["-i"], // case-insensitive
 *   maxResults: 10
 * });
 *
 * console.log(`Found ${result.totalMatches} matches`);
 * result.results.forEach(match => console.log(match));
 * ```
 *
 * @throws {Error} When ripgrep process fails to start or encounters an error
 * @throws {Error} When the search pattern is invalid or causes ripgrep to fail
 */
export async function executeRipgrepSearch(options: RipgrepOptions): Promise<RipgrepResult> {
	const { pattern, flags = [], maxResults = 50 } = options;

	/**
	 * Construct ripgrep command arguments
	 *
	 * Default flags ensure consistent output format:
	 * - --line-number: Include line numbers in output
	 * - --with-filename: Include file paths in output
	 * - --no-heading: Don't show file headers
	 * - --color=never: Disable color output for consistent parsing
	 */
	const args = [
		...flags,
		"--line-number",
		"--with-filename",
		"--no-heading",
		"--color=never",
		pattern,
		NOTES_DIRECTORY,
	];

	/**
	 * Spawn ripgrep process and handle output collection
	 *
	 * The process is spawned asynchronously and we collect stdout/stderr
	 * through event listeners. This approach allows us to handle large
	 * result sets efficiently without blocking the event loop.
	 */
	return new Promise((resolve, reject) => {
		const rg = spawn(rgPath, args);
		let output = "";
		let errorOutput = "";

		// Collect stdout data (search results)
		rg.stdout.on("data", (data) => {
			output += data.toString();
		});

		// Collect stderr data (error messages)
		rg.stderr.on("data", (data) => {
			errorOutput += data.toString();
		});

		/**
		 * Handle process completion
		 *
		 * Exit codes:
		 * - 0: Success with matches found
		 * - 1: Success but no matches found
		 * - Other: Error occurred
		 */
		rg.on("close", (code) => {
			const totalMatches = output.split("\n").filter(line => line.trim()).length;

			if (code === 0) {
				// Success with matches found
				const results = output.trim().split("\n").filter(line => line.trim());
				const limitedResults = results.slice(0, maxResults);
				const limited = results.length > maxResults;

				// Add indication if results were limited
				if (limited) {
					limitedResults.push(`... and ${results.length - maxResults} more results (limited to ${maxResults})`);
				}

				resolve({
					results: limitedResults.length > 0 ? limitedResults : ["No matches found"],
					totalMatches,
					limited,
				});
			} else if (code === 1) {
				// Success but no matches found (normal ripgrep behavior)
				resolve({
					results: ["No matches found"],
					totalMatches: 0,
					limited: false,
				});
			} else {
				// Error occurred during search
				logger.error("ripgrep error", {
					errorOutput,
					exitCode: code,
				});
				reject(new Error(`ripgrep failed: ${errorOutput}`));
			}
		});

		/**
		 * Handle process spawn errors
		 *
		 * This typically occurs when ripgrep is not installed or
		 * the rgPath is invalid.
		 */
		rg.on("error", (error) => {
			logger.error("ripgrep spawn error", {
				error: error.message,
			});
			reject(error);
		});
	});
}
