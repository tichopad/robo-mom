import { promises as fs } from "node:fs";
import { join, relative, resolve } from "node:path";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import {
	type Message as AiMessage,
	type CoreMessage,
	streamText,
	tool,
} from "ai";
import { z } from "zod";
import { logger } from "../../logger.ts";
import { queryDocuments } from "../../query-documents.ts";
import { executeRipgrepSearch } from "../../ripgrep.ts";
import { store } from "./store.ts";

// Security: Define the allowed directory for file operations
const NOTES_DIRECTORY = resolve("example_notes");

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

/**
 * Basic information about the user making the query (author of the notes).
 * More detailed information can be found by searching the notes using the searchNotes tool.
 * @returns Basic information about the user making the query (author of the notes).
 */
const aboutAuthor = tool({
	description:
		"Basic information about the user making the query (author of the notes)." +
		"More detailed information can be found by searching the notes using the searchNotes tool.",
	parameters: z.object({
		name: z.string().describe("Name of the user."),
	}),
	// TODO: Implement this (search notes looking for chunks with a corresponding frontmatter attribute, e.g. "tags: [about-me]")
	execute: async ({ name }) => {
		const logWithRequestId = logger.child({
			requestId: store.currentRequestId,
		});
		logWithRequestId.info("Tool aboutAuthor initiated", {
			toolName: "aboutAuthor",
			requestedName: name,
		});

		const result = {
			name,
			info: "The notes author is 33 year old developer from Ostrava, Czechia. His name is Michael.",
		};

		logWithRequestId.debug("Tool aboutAuthor completed", {
			toolName: "aboutAuthor",
			requestedName: name,
			returnedInfo: result,
		});

		return result;
	},
});

/**
 * Search the user's notes about a given query using a vector search.
 * @returns The most relevant notes in a structured format.
 */
const searchNotes = tool({
	description:
		"Search the user's notes about a given query using a vector search. Returns the most relevant notes in a structured format." +
		"The format is: <file-<index>> <filename> <content> <frontmatter> </file-<index>>",
	parameters: z.object({
		query: z.string().describe("The query to search for."),
	}),
	execute: async ({ query }) => {
		const logWithRequestId = logger.child({
			requestId: store.currentRequestId,
		});
		logWithRequestId.info("Tool searchNotes initiated", {
			toolName: "searchNotes",
			query,
		});

		store.debugInfo = `Searching notes for query: ${query}`;
		const documents = await queryDocuments(query, 5);
		store.debugInfo = `Found ${documents.length} documents`;

		const sortedDocuments = documents.toSorted(
			(a, b) => b.similarity - a.similarity,
		);

		logWithRequestId.debug("Tool searchNotes completed", {
			toolName: "searchNotes",
			query,
			documentsFound: documents.length,
			sortedDocuments,
		});

		return sortedDocuments.map(
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

/**
 * Search files in the notes directory using ripgrep patterns.
 * @returns Search results with file paths and matching lines.
 */
const grepFiles = tool({
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
				"Maximum number of results to return (default: 50, use lower values to avoid rate limits)",
			),
	}),
	execute: async ({ pattern, flags = [], maxResults = 50 }) => {
		const logWithRequestId = logger.child({
			requestId: store.currentRequestId,
		});
		logWithRequestId.info("Tool grepFiles initiated", {
			toolName: "grepFiles",
			pattern,
			flags,
			maxResults,
		});

		try {
			const result = await executeRipgrepSearch({
				pattern,
				flags,
				maxResults,
			});

			logWithRequestId.debug("Tool grepFiles completed", {
				toolName: "grepFiles",
				pattern,
				flags,
				maxResults,
				totalMatchesFound: result.totalMatches,
				limited: result.limited,
			});

			return result.results;
		} catch (error) {
			logWithRequestId.error("Tool grepFiles failed", {
				toolName: "grepFiles",
				pattern,
				flags,
				maxResults,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	},
});

/**
 * Read the contents of a specific file in the notes directory.
 * @returns The file contents as a string.
 */
const readFile = tool({
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
		const logWithRequestId = logger.child({
			requestId: store.currentRequestId,
		});
		logWithRequestId.info("Tool readFile initiated", {
			toolName: "readFile",
			filePath,
		});

		try {
			// Resolve the path relative to the notes directory
			const fullPath = join(NOTES_DIRECTORY, filePath);

			// Validate the path is within the notes directory
			validateNotesPath(fullPath);

			const content = await fs.readFile(fullPath, "utf-8");

			logWithRequestId.debug("Tool readFile completed", {
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
			logWithRequestId.error("Tool readFile failed", {
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

/**
 * Send a request to the LLM.
 * @param messages - The messages to send to the LLM.
 * @returns A stream of text from the LLM.
 */
export function sendRequestToLLM(
	messages: CoreMessage[] | Omit<AiMessage, "id">[],
) {
	const logWithRequestId = logger.child({
		requestId: store.currentRequestId,
	});
	logWithRequestId.debug("LLM request initiated", {
		conversationLength: messages.length,
		messages,
		model: "gemini-2.5-flash",
		maxSteps: 10,
		availableTools: ["aboutAuthor", "searchNotes", "grepFiles", "readFile"],
	});

	return streamText({
		model: google("gemini-2.5-flash"),
		messages,
		onStepFinish: (stepResult) => {
			// Log each step with structured data
			logWithRequestId.debug("LLM step completed", {
				stepIndex: stepResult.stepType === "initial" ? 0 : 1,
				stepType: stepResult.stepType,
				finishReason: stepResult.finishReason,
				usage: stepResult.usage,
				toolCallsCount: stepResult.toolCalls?.length || 0,
			});

			// Log tool calls (if any) for this step
			if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
				logWithRequestId.info("Tool calls initiated", {
					toolCalls: stepResult.toolCalls.map((call) => ({
						toolName: call.toolName,
						args: call.args,
						toolCallId: call.toolCallId,
					})),
				});
			}

			// Log each tool call individually with structured data
			for (const toolResult of stepResult.toolResults) {
				logWithRequestId.info("Tool execution completed", {
					toolName: toolResult.toolName,
					toolArgs: toolResult.args,
					toolResultType: toolResult.type,
					toolResult: toolResult.result,
					executionSuccess: toolResult.type === "tool-result",
				});
			}
		},
		system:
			// biome-ignore lint/style/useTemplate: It's more readable this way without having to use dedent
			"You are a helpful assistant that can search for notes using searchNotes, grepFiles, and readFile tools and answer questions about them." +
			"Assume that the user is the author of the notes you have access to unless the note explicitly says otherwise." +
			`Today's date is ${new Date().toLocaleDateString()}.` +
			"Follow these rules:\n" +
			"1. ALWAYS use the aboutAuthor tool FIRST when the user asks about themselves, their family, personal details, or uses words like 'my', 'me', 'I', 'family', 'personal', etc.\n" +
			"2. ALWAYS use multiple tools to get comprehensive results. Start with searchNotes for semantic search, then use grepFiles for exact pattern matching.\n" +
			"3. searchNotes finds semantically relevant content but may miss specific terms. grepFiles finds exact text matches with regex support.\n" +
			"4. Combine results from both tools for the most complete answer. Use readFile to get full context when needed.\n" +
			"5. If you used the searchNotes, grepFiles, or readFile tools for a query, always link the sources in the response.\n" +
			"6. Aim for readability and clarity. Avoid overly verbose responses.\n" +
			"7. If you are not sure about the answer, say so.\n" +
			"8. Use grepFiles with regex patterns and flags like '-i' for case-insensitive search, '-w' for word boundaries.\n" +
			"9. For best results, use searchNotes first, then grepFiles with relevant keywords from the searchNotes results.\n" +
			"10. When the user asks about themselves, combine aboutAuthor results with searchNotes/grepFiles to provide comprehensive personal information.",
		tools: {
			aboutAuthor,
			searchNotes,
			grepFiles,
			readFile,
		},
		maxSteps: 10,
	});
}
