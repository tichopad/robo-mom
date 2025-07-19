import { proxy, useSnapshot } from "valtio";
import { runWithRequestId } from "#src/context/request-context.ts";
import { createStreamingChatCompletion } from "#src/llms/chat-completion.ts";
import { logger } from "#src/logger/logger.ts";
import type { Message } from "#src/ui/types.ts";
import { createRandomString } from "#src/utils.ts";

type Store = {
	/** The messages in the chat. */
	messages: Message[];
	/** The current user input. */
	input: string;
	/** Whether the chat is loading. */
	isLoading: boolean;
	/** The error message. */
	error: string | null;
	/** The debug info. */
	debugInfo: string | null;
	/** The streaming response. */
	streamingResponse: string;
};

/** Reactive chat store. */
export const store = proxy<Store>({
	messages: [],
	input: "",
	isLoading: false,
	error: null,
	debugInfo: null,
	streamingResponse: "",
});

/** Hook to get the reactive chat store. */
export function useChatStore() {
	return useSnapshot(store);
}

// Chat completion instance
const sendRequestToLLM = createStreamingChatCompletion({
	onDebugInfo: (info: string) => {
		store.debugInfo = info;
	},
	onError: (error: Error) => {
		store.error = error.message;
	},
});

/**
 * Send the current user input to the LLM and pipes the streaming response to the store.
 * Automatically generates a request ID for this conversation turn and logs it.
 */
export async function sendUserInputToLLM(): Promise<void> {
	const requestId = createRandomString();
	return runWithRequestId(requestId, sendUserInputToLLMWithoutRequestId);
}

/**
 * Send the current user input to the LLM and pipes the streaming response to the store.
 * The is the inner function that actually sends the request to the LLM.
 * @returns A promise that resolves when the request is complete.
 */
async function sendUserInputToLLMWithoutRequestId(): Promise<void> {
	const userMessageId = createRandomString();

	const input = store.input.trim();
	if (input === "") {
		store.error = "Input is empty, skipping request.";
		logger.error("Input is empty, skipping request.");
		return;
	}
	if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
		store.error =
			"GOOGLE_GENERATIVE_AI_API_KEY not found. Please add it to your .env file.";
		logger.error(
			"GOOGLE_GENERATIVE_AI_API_KEY not found. Please add it to your .env file.",
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
		logger.debug("Stream started, receiving tokens...");

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
		logger.debug("LLM response completed", {
			assistantMessageId,
			responseLength: store.streamingResponse.length,
			totalChunks: chunkCount,
			approximateTokens: totalTokens,
			isComplete: true,
		});

		// Log the full response content for debugging
		logger.debug("LLM response content", {
			assistantMessageId,
			content: store.streamingResponse.trim(),
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		// Log the error with structured data
		logger.error("LLM request failed", {
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
		logger.debug("Conversation turn completed", {
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

/**
 * Start a new conversation by clearing all messages and resetting the state.
 */
export function startNewConversation(): void {
	store.messages = [];
	store.input = "";
	store.isLoading = false;
	store.error = null;
	store.debugInfo = null;
	store.streamingResponse = "";
}
