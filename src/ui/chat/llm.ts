import { openai } from "@ai-sdk/openai";
import {
	type Message as AiMessage,
	type CoreMessage,
	streamText,
	tool,
} from "ai";
import { z } from "zod";
import { logger } from "../../logger.ts";
import { queryDocuments } from "../../query-documents.ts";
import { store } from "./store.ts";

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
		logWithRequestId.debug("Tool aboutAuthor initiated", {
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
		logWithRequestId.debug("Tool searchNotes initiated", {
			toolName: "searchNotes",
			query,
		});

		store.debugInfo = `Searching notes for query: ${query}`;
		const documents = await queryDocuments(query);
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
					<filename>${doc.filename}</filename>
					<content>${doc.text}</content>
					<frontmatter>${JSON.stringify(doc.frontmatter_attributes)}</frontmatter>
				</file-${i}>
				`,
		);
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
		model: "gpt-4o",
		maxSteps: 5,
		availableTools: ["aboutAuthor", "searchNotes"],
	});

	return streamText({
		model: openai("gpt-4o"),
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

			// Log each tool call individually with structured data
			for (const toolResult of stepResult.toolResults) {
				logWithRequestId.debug("Tool execution completed", {
					toolName: toolResult.toolName,
					toolArgs: toolResult.args,
					toolResultType: toolResult.type,
					toolResult: toolResult.result,
					executionSuccess: toolResult.type === "tool-result",
				});
			}

			// Log tool calls (if any) for this step
			if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
				logWithRequestId.debug("Tool calls in step", {
					toolCalls: stepResult.toolCalls.map((call) => ({
						toolName: call.toolName,
						args: call.args,
						toolCallId: call.toolCallId,
					})),
				});
			}
		},
		system:
			"You are a helpful assistant that can search for notes and answer questions about them." +
			"Assume that the user is the author of the notes you have access to unless the note explicitly says otherwise." +
			"Follow these rules:\n" +
			"1. If you used the searchNotes tool for a query, always link the sources in the response.\n" +
			"2. Aim for readability and clarity. Avoid overly verbose responses.\n" +
			"3. If you are not sure about the answer, say so.",
		tools: {
			aboutAuthor,
			searchNotes,
		},
		maxSteps: 5,
	});
}
