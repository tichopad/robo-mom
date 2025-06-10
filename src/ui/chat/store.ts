import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { proxy, useSnapshot } from "valtio";
import z from "zod";
import { queryDocuments } from "../../query-documents";
import type { Message } from "../types";
import { createRandomString } from "../utils";

// Test data
const testMessages: Message[] = [
	{
		role: "user",
		content: "whats PFOS stand for in terms of chemicals?",
		id: "1",
	},
	{
		role: "assistant",
		content:
			"PFOS stands for Perfluorooctanesulfonic acid. It is a man-made chemical compound that belongs to the group of per- and polyfluoroalkyl substances (PFAS). PFOS is known for its persistence in the environment and potential harmful effects on human health.",
		id: "2",
	},
	{
		role: "user",
		content: "What is the capital of France?",
		id: "3",
	},
	{
		role: "assistant",
		content: "PFOS is harmful effects on human health.",
		id: "5",
	},
];

// -- Store --

type Store = {
	messages: Message[];
	input: string;
	isLoading: boolean;
	error: string | null;
	debugInfo: string | null;
	streamingResponse: string;
};

const store = proxy<Store>({
	messages: [],
	input: "",
	isLoading: false,
	error: null,
	debugInfo: null,
	streamingResponse: "",
});

export function useChatStore() {
	return useSnapshot(store);
}

// -- Actions --

const aboutUser = tool({
	description: "Basic information about the user making the query.",
	parameters: z.object({
		name: z.string().describe("Name of the user."),
	}),
	// TODO: Implement this (search notes looking for chunks with a corresponding frontmatter attribute, e.g. "tags: [about-me]")
	execute: async ({ name }) => {
		return {
			name,
			info: "The user's 33 year old developer from Ostrava, Czechia. His name is Michael.",
		};
	},
});

const searchNotes = tool({
	description: "Search the user's notes about a given query.",
	parameters: z.object({
		query: z.string().describe("The query to search for."),
	}),
	execute: async ({ query }) => {
		store.debugInfo = `Searching notes for query: ${query}`;
		const documents = await queryDocuments(query);
		store.debugInfo = `Found ${documents.length} documents`;
		return documents
			.toSorted((a, b) => b.similarity - a.similarity)
			.map(
				(doc) => `
					<filename>${doc.filename}</filename>
					<content>${doc.text}</content>
					<frontmatter>${JSON.stringify(doc.frontmatter_attributes)}</frontmatter>
				`,
			);
	},
});

export async function sendUserInputToLLM(): Promise<void> {
	const input = store.input.trim();
	if (input === "") {
		logDebugInfo("Input is empty, skipping request.");
		return;
	}
	if (!process.env.OPENAI_API_KEY) {
		logError("OPENAI_API_KEY not found. Please add it to your .env file.");
		return;
	}

	// Append input as a user message

	store.messages.push({
		role: "user",
		content: input,
		id: createRandomString(),
	});

	// Clear error and input

	store.error = null;
	store.input = "";
	store.streamingResponse = "";

	try {
		// Send request to OpenAI
		store.isLoading = true;
		logDebugInfo("Sending request to OpenAI...");
		const { textStream } = streamText({
			model: openai("gpt-3.5-turbo"),
			messages: store.messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			})),
			system:
				"You are a helpful assistant that can search for notes and answer questions about them." +
				"Assume that the user is the author of the notes you have access to unless the note explicitly says otherwise.",
			tools: {
				searchNotes,
			},
			maxSteps: 2,
		});

		logDebugInfo("Stream started, receiving tokens...");

		// Stream the response in
		let chunkCount = 0;
		for await (const chunk of textStream) {
			store.streamingResponse += chunk;
			chunkCount++;
			logDebugInfo(`Received chunk ${chunkCount}`);
		}
	} catch (error) {
		logDebugInfo("API request failed");
		logError(
			`Error: ${error instanceof Error ? error.message : String(error)}`,
		);
	} finally {
		// Compose the whole response as an assistant message
		store.messages.push({
			role: "assistant",
			content: store.streamingResponse.trim(),
			id: createRandomString(),
		});
		// Clear the streaming response once we're done with it
		store.streamingResponse = "";
		store.debugInfo = null;
		store.isLoading = false;
	}
}

export function logDebugInfo(message: string): void {
	store.debugInfo = message;
}

export function logError(error: string): void {
	store.error = error;
}

export function appendInput(input: string): void {
	store.input += input;
}

export function deleteInputTail(): void {
	store.input = store.input.slice(0, -1);
}
