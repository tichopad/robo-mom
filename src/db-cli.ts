import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { defineCommand, runMain } from "citty";
import { db } from "./db/client.ts";
import { logger } from "./logger.ts";

const main = defineCommand({
	meta: {
		name: "db-cli",
		version: "1.0.0",
		description: "CLI for executing SQL queries against the local database",
	},
	args: {
		query: {
			type: "string",
			description: "SQL query to execute",
			alias: "q",
		},
		interactive: {
			type: "boolean",
			description: "Start an interactive SQL shell",
			alias: "i",
			default: false,
		},
		output: {
			type: "string",
			description:
				"Output query results to a JSON file (only works with --query)",
			alias: "o",
		},
	},
	async run({ args }) {
		if (args.interactive) {
			if (args.output) {
				logger.warn("The --output option is ignored in interactive mode");
			}
			await startInteractiveMode();
		} else if (args.query) {
			const result = await executeQuery(args.query);

			// Save to file if output is specified
			if (args.output && result?.rows) {
				await saveResultsToFile(result.rows, args.output);
			}
		} else {
			logger.info(
				"No query provided. Use --query to execute a query or --interactive for interactive mode.",
			);
			logger.info('Example: pnpm db-cli --query "SELECT * FROM notes LIMIT 5"');
		}
	},
});

async function executeQuery(query: string) {
	try {
		logger.info(`Executing query: ${query}`);
		const start = performance.now();
		const result = await db.execute(query);
		const end = performance.now();

		// Format the result for better display
		const formattedRows = formatRowsForDisplay(result.rows);

		console.log("\nResult:");
		if (formattedRows.length > 0) {
			displayResults(formattedRows);
		} else {
			console.log("(No rows returned)");
		}

		logger.info(`Query executed in ${(end - start).toFixed(2)}ms`);
		logger.info(`Rows affected: ${result.rows.length}`);

		return result;
	} catch (error) {
		if (error instanceof Error)
			logger.error(`Error executing query: ${error.message}`);
		else throw error;
	}
}

/**
 * Save query results to a JSON file
 */
async function saveResultsToFile(
	rows: Record<string, unknown>[],
	outputPath: string,
): Promise<void> {
	try {
		const absolutePath = resolve(outputPath);
		await writeFile(absolutePath, JSON.stringify(rows, null, 2));
		logger.info(`Results saved to: ${absolutePath}`);
	} catch (error) {
		if (error instanceof Error) {
			logger.error(`Error saving results to file: ${error.message}`);
		} else {
			throw error;
		}
	}
}

/**
 * Format rows for better display in console
 * - Truncates long text values
 * - Replaces newlines with spaces
 */
function formatRowsForDisplay(
	rows: Record<string, unknown>[],
): Record<string, unknown>[] {
	const MAX_COLUMN_WIDTH = 60;

	return rows.map((row) => {
		const formattedRow = { ...row };
		for (const key in formattedRow) {
			if (typeof formattedRow[key] === "string") {
				// Replace newlines with spaces
				let value = (formattedRow[key] as string).replace(/\n/g, "\\n");

				// Truncate long text
				if (value.length > MAX_COLUMN_WIDTH) {
					value = `${value.substring(0, MAX_COLUMN_WIDTH - 3)}...`;
				}

				formattedRow[key] = value;
			} else if (Array.isArray(formattedRow[key])) {
				// Format arrays to prevent breaking the table
				formattedRow[key] = JSON.stringify(formattedRow[key]).substring(
					0,
					MAX_COLUMN_WIDTH,
				);
				if ((formattedRow[key] as string).length === MAX_COLUMN_WIDTH) {
					formattedRow[key] = `${formattedRow[key]}...`;
				}
			}
		}
		return formattedRow;
	});
}

/**
 * Display results in the most appropriate format based on the number and width of columns
 */
function displayResults(rows: Record<string, unknown>[]): void {
	if (rows.length === 0) return;

	const firstRow = rows[0] as Record<string, unknown>;
	const columnCount = Object.keys(firstRow).length;

	// Use standard table for tables with few columns
	if (columnCount <= 4) {
		console.table(rows);
		return;
	}

	// For tables with many columns, use a more readable vertical format
	for (const [index, rowData] of rows.entries()) {
		const row = rowData as Record<string, unknown>;
		console.log(`\n--- Row ${index} ---`);

		// Find the longest column name for alignment
		const columnNames = Object.keys(row);
		const maxColumnWidth = Math.max(...columnNames.map((name) => name.length));

		// Display each field with proper alignment
		for (const [key, value] of Object.entries(row)) {
			const padding = " ".repeat(maxColumnWidth - key.length);
			console.log(`${key}:${padding} ${value}`);
		}

		// Add a separator between rows
		if (index < rows.length - 1) {
			console.log("");
		}
	}
}

async function startInteractiveMode() {
	const readline = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	logger.info(
		"Interactive SQL shell started. Type your SQL queries and press Enter.",
	);
	logger.info("Type 'exit' or 'quit' to exit the shell.");

	while (true) {
		const query = await readline.question("\nSQL> ");

		if (query.toLowerCase() === "exit" || query.toLowerCase() === "quit") {
			break;
		}

		if (query.trim() === "") {
			continue;
		}

		await executeQuery(query);
	}

	readline.close();
	logger.info("Interactive SQL shell closed.");
}

runMain(main);
