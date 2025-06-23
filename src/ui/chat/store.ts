import { proxy, useSnapshot } from "valtio";
import { logger } from "../../logger.ts";
import type { Message } from "../types.ts";
import { createRandomString } from "../utils.ts";
import { sendRequestToLLM } from "./llm.ts";

type Store = {
	messages: Message[];
	input: string;
	isLoading: boolean;
	error: string | null;
	debugInfo: string | null;
	streamingResponse: string;
	currentRequestId: string | null;
};

export const store = proxy<Store>({
	messages: [],
	input: "",
	isLoading: false,
	error: null,
	debugInfo: null,
	streamingResponse: "",
	currentRequestId: null,
});

export function useChatStore() {
	return useSnapshot(store);
}

/**
 * Send the current user input to the LLM and pipes the streaming response to the store.
 */
export async function sendUserInputToLLM(): Promise<void> {
	// Generate a request ID for this conversation turn
	const userMessageId = createRandomString();
	const requestId = createRandomString();
	store.currentRequestId = requestId;
	const logWithRequestId = logger.child({ requestId });

	const input = store.input.trim();
	if (input === "") {
		store.error = "Input is empty, skipping request.";
		logWithRequestId.error("Input is empty, skipping request.");
		return;
	}
	if (!process.env.OPENAI_API_KEY) {
		store.error = "OPENAI_API_KEY not found. Please add it to your .env file.";
		logWithRequestId.error(
			"OPENAI_API_KEY not found. Please add it to your .env file.",
		);
		return;
	}

	// Append input as a user message
	store.messages.push({
		role: "user",
		content: input,
		id: userMessageId,
	});

	// Clear error and input
	store.error = null;
	store.input = "";
	store.streamingResponse = "";

	try {
		// Send request to OpenAI
		store.isLoading = true;
		const messages = store.messages.map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));

		store.debugInfo = "Sending request to OpenAI...";

		const { textStream } = sendRequestToLLM(messages);

		store.debugInfo = "Stream started, receiving tokens...";
		logWithRequestId.debug("Stream started, receiving tokens...");

		// Stream the response in
		let chunkCount = 0;
		let totalTokens = 0;
		for await (const chunk of textStream) {
			store.streamingResponse += chunk;
			chunkCount++;
			totalTokens += chunk.length;

			// Log every 10th chunk to avoid spam while still providing progress info
			if (chunkCount % 10 === 0) {
				store.debugInfo = `Received chunk ${chunkCount}`;
			}
		}

		// Log the final response with structured data
		const assistantMessageId = createRandomString();
		logWithRequestId.debug("LLM response completed", {
			assistantMessageId,
			responseLength: store.streamingResponse.length,
			totalChunks: chunkCount,
			approximateTokens: totalTokens,
			isComplete: true,
		});

		// Log the full response content for debugging
		logWithRequestId.debug("LLM response content", {
			assistantMessageId,
			content: store.streamingResponse.trim(),
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		// Log the error with structured data
		logWithRequestId.error("LLM request failed", {
			error: errorMessage,
			errorType: error instanceof Error ? error.constructor.name : "Unknown",
			userInput: input,
			conversationLength: store.messages.length,
		});

		store.error = errorMessage;
	} finally {
		// Compose the whole response as an assistant message
		const assistantMessageId = createRandomString();
		store.messages.push({
			role: "assistant",
			content: store.streamingResponse.trim(),
			id: assistantMessageId,
		});

		// Log the conversation turn completion
		logWithRequestId.debug("Conversation turn completed", {
			assistantMessageId,
			finalConversationLength: store.messages.length,
			responseWasStreamed: store.streamingResponse.length > 0,
		});

		// Clear the streaming response once we're done with it
		store.streamingResponse = "";
		store.debugInfo = null;
		store.isLoading = false;
	}
}

/**
 * Append a string to the input.
 */
export function appendInput(input: string): void {
	store.input += input;
}

/**
 * Delete the last character of the input.
 */
export function deleteInputTail(): void {
	store.input = store.input.slice(0, -1);
}
