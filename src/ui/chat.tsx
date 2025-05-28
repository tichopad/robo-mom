import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";
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
];

export default function Chat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [debugInfo, setDebugInfo] = useState<string | null>(null);
	const [streamingResponse, setStreamingResponse] = useState("");
	const app = useApp();

	useInput((inputChar, key) => {
		if (isLoading) return; // Prevent input while loading

		if (key.return && input.trim() === "/exit") {
			app.exit();
			return;
		}

		if (key.return) {
			// Don't submit empty messages
			if (input.trim() === "") return;

			const newUserMessage: Message = {
				role: "user",
				content: input,
				id: createRandomString(),
			};
			setMessages((prevMessages) => [...prevMessages, newUserMessage]);

			// Clear input and prepare for AI response
			setInput("");
			setIsLoading(true);
			setError(null);
			setDebugInfo("Preparing to send request...");

			// Get AI response
			handleAIResponse(newUserMessage);
		} else if (key.backspace || key.delete) {
			setInput((prev) => prev.slice(0, -1));
		} else if (inputChar) {
			setInput((prev) => prev + inputChar);
		}
	});

	// Function to get AI response
	const handleAIResponse = async (userMessage: Message) => {
		// Check for API key
		if (!process.env.OPENAI_API_KEY) {
			setError("OPENAI_API_KEY not found. Please add it to your .env file.");
			setIsLoading(false);
			return;
		}

		try {
			// Debug: Log API key presence
			setDebugInfo("Starting API request...");

			const allMessages = [
				...messages.map((msg) => ({
					role: msg.role as "user" | "assistant",
					content: msg.content,
				})),
				{ role: "user" as const, content: userMessage.content },
			];

			setDebugInfo("Sending request to OpenAI...");

			// Create empty assistant message for streaming
			const assistantId = `assistant-${Date.now()}`;
			setStreamingResponse("");

			// Use streamText to get real-time responses
			const { textStream } = streamText({
				model: openai("gpt-3.5-turbo"),
				messages: allMessages,
			});

			setDebugInfo("Stream connected, receiving tokens...");

			// Initialize accumulated response
			let fullResponse = "";

			// Stream the response chunks
			for await (const chunk of textStream) {
				fullResponse += chunk;
				setStreamingResponse(fullResponse);
			}

			// When the stream ends, add the full message to the conversation
			const newAssistantMessage: Message = {
				role: "assistant",
				content: fullResponse,
				id: assistantId,
			};

			setMessages((prev) => [...prev, newAssistantMessage]);
			setStreamingResponse("");
			setDebugInfo(null);
		} catch (error) {
			setDebugInfo(
				`API error: ${error instanceof Error ? error.message : String(error)}`,
			);
			setError(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			setIsLoading(false);
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
			{DEBUG && debugInfo ? <DebugBox message={debugInfo} /> : null}
			{error ? <ErrorBox message={error} /> : null}
			<MessagesList messages={messages} streamingResponse={streamingResponse} />
			{isLoading ? (
				<Box gap={1}>
					<Box width={3}>
						<LoadingSpinner />
					</Box>
					<Text color="#777" dimColor bold={false}>
						thinking...
					</Text>
				</Box>
			) : (
				<PromptInput input={input} />
			)}
			<Footer />
		</Box>
	);
}
