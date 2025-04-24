import { defineCommand, runMain } from "citty";
import { db } from "./db/client.ts";
import { logger } from "./logger.ts";
import { createInterface } from "node:readline/promises";

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
	},
	async run({ args }) {
		if (args.interactive) {
			await startInteractiveMode();
		} else if (args.query) {
			await executeQuery(args.query);
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

		console.log("\nResult:");
		console.table(result.rows);
		logger.info(`Query executed in ${(end - start).toFixed(2)}ms`);
		logger.info(`Rows affected: ${result.rows.length}`);

		return result;
	} catch (error) {
		if (error instanceof Error)
			logger.error(`Error executing query: ${error.message}`);
    else throw error
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
