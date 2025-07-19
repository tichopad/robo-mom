import fs from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { logger } from "#src/logger/logger.ts";

// TODO: this shouldn't be static
const NOTES_DIRECTORY = resolve(
	import.meta.dirname,
	"../../../",
	"example_notes",
);

/**
 * Validate that a file path is within the allowed notes directory
 */
function validateNotesPath(filePath: string): string {
	const resolvedPath = resolve(filePath);
	const relativePath = relative(NOTES_DIRECTORY, resolvedPath);

	if (relativePath.startsWith("..") || resolve(relativePath) === relativePath) {
		throw new Error("Access denied: Path is outside the notes directory");
	}

	return resolvedPath;
}

type ReadFileToolParams = {
	onDebugInfo: (info: string) => void;
};

/**
 * Creates a tool that allows the LLM to read the contents of a specific file in the notes directory.
 */
export function createReadFileTool({ onDebugInfo }: ReadFileToolParams) {
	/**
	 * Read the contents of a specific file in the notes directory.
	 * @returns The file contents as a string.
	 */
	return tool({
		description:
			"Read the contents of a specific file in the notes directory. " +
			"Use this to get the full content of a file after finding it with grepFiles or searchNotes.",
		parameters: z.object({
			filePath: z
				.string()
				.describe(
					"The path to the file to read (relative to the notes directory)",
				),
		}),
		execute: async ({ filePath }) => {
			// TODO: use requestId
			logger.info("Tool readFile initiated", {
				toolName: "readFile",
				filePath,
			});

			onDebugInfo(`Tool readFile initiated: filePath=${filePath}`);

			try {
				// Resolve the path relative to the notes directory
				const fullPath = join(NOTES_DIRECTORY, filePath);

				// Validate the path is within the notes directory
				validateNotesPath(fullPath);

				const content = await fs.readFile(fullPath, "utf-8");

				logger.debug("Tool readFile completed", {
					toolName: "readFile",
					filePath,
					contentLength: content.length,
				});

				return {
					filePath,
					content,
					size: content.length,
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				logger.error("Tool readFile failed", {
					toolName: "readFile",
					filePath,
					error: errorMessage,
				});

				if (errorMessage.includes("ENOENT")) {
					return { error: `File not found: ${filePath}` };
				}
				if (errorMessage.includes("Access denied")) {
					return { error: `Access denied: ${filePath}` };
				}
				return { error: `Failed to read file: ${errorMessage}` };
			}
		},
	});
}
