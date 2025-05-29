import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Box, Text, useApp, useInput } from "ink";
import { useReducer, useState } from "react";
import DebugBox from "./components/debug-box.tsx";
import { ErrorBox } from "./components/error-box.tsx";
import Footer from "./components/footer.tsx";
import { LoadingSpinner } from "./components/loading-spinner.tsx";
import MessagesList from "./components/messages/messages-list.tsx";
import PromptInput from "./components/prompt-input.tsx";
import type { Message } from "./types.ts";
import { createRandomString } from "./utils.ts";

const DEBUG = true;

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

type State = {
	messages: Message[];
	input: string;
	isLoading: boolean;
	error: string | null;
	debugInfo: string | null;
	streamingResponse: string;
};

type Action =
	| { type: "add-message"; message: Message }
	| { type: "set-input"; input: string }
	| { type: "set-is-loading"; isLoading: boolean }
	| { type: "set-error"; error: string | null }
	| { type: "set-debug-info"; debugInfo: string | null }
	| { type: "set-streaming-response"; streamingResponse: string }
	| { type: "llm-request-start" }
	| { type: "delete-char" }
	| { type: "add-char"; char: string }
	| {
			type: "llm-request-stream-end";
			assistantMessage: Message;
	  };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "add-message":
			return { ...state, messages: [...state.messages, action.message] };
		case "set-input":
			return { ...state, input: action.input };
		case "set-is-loading":
			return { ...state, isLoading: action.isLoading };
		case "set-error":
			return { ...state, error: action.error, isLoading: false };
		case "set-debug-info":
			return { ...state, debugInfo: action.debugInfo };
		case "set-streaming-response":
			return { ...state, streamingResponse: action.streamingResponse };
		case "llm-request-start":
			return {
				...state,
				isLoading: true,
				error: null,
				debugInfo: "Preparing to send request...",
				input: "",
			};
		case "delete-char":
			return { ...state, input: state.input.slice(0, -1) };
		case "add-char":
			return { ...state, input: state.input + action.char };
		case "llm-request-stream-end":
			return {
				...state,
				messages: [...state.messages, action.assistantMessage],
				streamingResponse: "",
				debugInfo: null,
				isLoading: false,
			};
		default:
			return state;
	}
}

const initialState: State = {
	messages: [],
	input: "",
	isLoading: false,
	error: null,
	debugInfo: null,
	streamingResponse: "",
};

export default function Chat() {
	const [state, dispatch] = useReducer(reducer, initialState);
	const app = useApp();

	useInput((inputChar, key) => {
		if (state.isLoading) return; // Prevent input while loading

		if (key.return && state.input.trim() === "/exit") {
			app.exit();
			return;
		}

		if (key.return) {
			// Don't submit empty messages
			if (state.input.trim() === "") return;

			const newUserMessage: Message = {
				role: "user",
				content: state.input,
				id: createRandomString(),
			};
			dispatch({ type: "add-message", message: newUserMessage });

			dispatch({ type: "llm-request-start" });

			// Get AI response
			handleAIResponse(newUserMessage);
		} else if (key.backspace || key.delete) {
			dispatch({ type: "delete-char" });
		} else if (inputChar) {
			dispatch({ type: "add-char", char: inputChar });
		}
	});

	// Function to get AI response
	const handleAIResponse = async (userMessage: Message) => {
		// Check for API key
		if (!process.env.OPENAI_API_KEY) {
			dispatch({
				type: "set-error",
				error: "OPENAI_API_KEY not found. Please add it to your .env file.",
			});
			return;
		}

		try {
			// Debug: Log API key presence
			dispatch({
				type: "set-debug-info",
				debugInfo: "Starting API request...",
			});

			const allMessages = state.messages
				.map((msg) => ({
					role: msg.role as "user" | "assistant",
					content: msg.content,
				}))
				.concat({ role: "user" as const, content: userMessage.content });

			dispatch({
				type: "set-debug-info",
				debugInfo: "Sending request to OpenAI...",
			});

			dispatch({ type: "set-streaming-response", streamingResponse: "" });

			// Use streamText to get real-time responses
			const { textStream } = streamText({
				model: openai("gpt-3.5-turbo"),
				messages: allMessages,
			});

			// setDebugInfo("Stream connected, receiving tokens...");
			dispatch({
				type: "set-debug-info",
				debugInfo: "Stream connected, receiving tokens...",
			});

			// Initialize accumulated response
			let fullResponse = "";

			// Stream the response chunks
			for await (const chunk of textStream) {
				fullResponse += chunk;
				dispatch({
					type: "set-streaming-response",
					streamingResponse: fullResponse,
				});
			}

			// When the stream ends, add the full message to the conversation
			const newAssistantMessage: Message = {
				role: "assistant",
				content: fullResponse.trim(),
				id: createRandomString(),
			};

			dispatch({
				type: "llm-request-stream-end",
				assistantMessage: newAssistantMessage,
			});
		} catch (error) {
			dispatch({
				type: "set-debug-info",
				debugInfo: `API error: ${error instanceof Error ? error.message : String(error)}`,
			});
			dispatch({
				type: "set-error",
				error: `Error: ${error instanceof Error ? error.message : String(error)}`,
			});
		} finally {
			dispatch({ type: "set-is-loading", isLoading: false });
		}
	};

	return (
		<Box
			flexDirection="column"
			width="100%"
			height="100%"
			borderStyle="bold"
			borderColor="#333"
			paddingY={1}
			paddingX={2}
			gap={1}
			margin={0}
		>
			{DEBUG && state.debugInfo ? <DebugBox message={state.debugInfo} /> : null}
			{state.error ? <ErrorBox message={state.error} /> : null}
			<MessagesList
				messages={state.messages}
				streamingResponse={state.streamingResponse}
			/>
			{state.isLoading ? (
				<Box gap={2}>
					<Box width={3} justifyContent="flex-end">
						<LoadingSpinner />
					</Box>
					<Text color="#777" dimColor bold={false}>
						thinking...
					</Text>
				</Box>
			) : (
				<PromptInput input={state.input} />
			)}
			<Footer />
		</Box>
	);
}
