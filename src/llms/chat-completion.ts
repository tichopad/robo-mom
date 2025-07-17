import { google } from "@ai-sdk/google";
import {
	type Message as AiMessage,
	type CoreMessage,
	type Tool,
	streamText,
} from "ai";
import { createAboutAuthorTool } from "#src/llms/tools/about-author.ts";
import { createReadFileTool } from "#src/llms/tools/read-file.ts";
import { createRipgrepFilesTool } from "#src/llms/tools/ripgrep-files.ts";
import { createSearchNotesTool } from "#src/llms/tools/search-notes.ts";
import { logger } from "#src/logger.ts";
import { isError, isSerializableObject } from "#src/utils.ts";

function systemPrompt(tools: Record<string, Tool>) {
	return (
		// biome-ignore lint/style/useTemplate: It's more readable this way without having to use dedent
		`You are a helpful assistant that can search for notes using ${Object.keys(tools).join(", ")} tools and answer questions about them.` +
		"Assume that the user is the author of the notes you have access to unless the note explicitly says otherwise." +
		`Current date and time is ${new Date().toISOString()}.` +
		`The user's timezone is ${Intl.DateTimeFormat().resolvedOptions().timeZone}.` +
		"Follow these rules:\n" +
		"1. ALWAYS use the aboutAuthor tool FIRST when the user asks about themselves, their family, personal details, or uses words like 'my', 'me', 'I', 'family', 'personal', etc." +
		"Use the limit parameter to return more or less information.\n" +
		"2. ALWAYS use multiple tools to get comprehensive results. Start with searchNotes for semantic search, then use ripgrepFiles for exact pattern matching.\n" +
		"3. searchNotes finds semantically relevant content but may miss specific terms. ripgrepFiles finds exact text matches with regex support.\n" +
		"4. Combine results from both tools for the most complete answer. Use readFile to get full context when needed.\n" +
		"5. If you used the searchNotes, ripgrepFiles, or readFile tools for a query, always link the sources in the response.\n" +
		"6. Aim for readability and clarity. Avoid overly verbose responses.\n" +
		"7. If you are not sure about the answer, say so.\n" +
		"8. Use ripgrepFiles with regex patterns and flags like '-i' for case-insensitive search, '-w' for word boundaries.\n" +
		"9. For best results, use searchNotes first, then ripgrepFiles with relevant keywords from the searchNotes results.\n" +
		"10. When the user asks about themselves, combine aboutAuthor results with searchNotes/ripgrepFiles to provide comprehensive personal information.\n" +
		"11. ALWAYS phrase searchNotes queries as questions. For example, instead of searching for 'meeting notes', search for 'What are the meeting notes about?' or 'What meetings have I documented?'"
	);
}

/**
 * Parameters for the streaming chat completion instance.
 */
type StreamingChatCompletionParams = {
	onDebugInfo: (message: string) => void;
	onError: (error: Error) => void;
};

/**
 * Create a streaming chat completion instance.
 * @param onDebugInfo - A function to call when debug info is available.
 * @param onError - A function to call when an error occurs.
 * @returns A function to send a request to the LLM.
 */
export function createStreamingChatCompletion({
	onDebugInfo,
	onError,
}: StreamingChatCompletionParams) {
	const tools = {
		aboutAuthor: createAboutAuthorTool({ onDebugInfo }),
		searchNotes: createSearchNotesTool({ onDebugInfo }),
		ripgrepFiles: createRipgrepFilesTool({ onDebugInfo }),
		readFile: createReadFileTool({ onDebugInfo }),
	};
	/**
	 * Send a request to the LLM.
	 * @param messages - The messages to send to the LLM.
	 * @returns A stream of text from the LLM.
	 */
	return function sendRequestToLLM(
		messages: CoreMessage[] | Omit<AiMessage, "id">[],
	) {
		const model = google("gemini-2.5-flash");

		// TODO: use requestId
		logger.debug("LLM request initiated", {
			conversationLength: messages.length,
			messages,
			modelId: model.modelId,
			modelProvider: model.provider,
			availableTools: Object.keys(tools),
		});

		return streamText({
			model,
			messages,
			system: systemPrompt(tools),
			tools,
			maxSteps: 6,
			onError: ({ error }) => {
				logger.debug("LLM request failed", { error });

				const err = isError(error)
					? error
					: isSerializableObject(error)
						? new Error(error.toString())
						: new Error("Unknown error");

				logger.error("LLM request failed", { error });
				onError(err);
			},
			onFinish: (result) => {
				logger.info("LLM request finished", { result });
				onDebugInfo("LLM request finished.");
			},
			onStepFinish: (stepResult) => {
				// Log each step with structured data
				logger.debug("LLM step completed", {
					stepIndex: stepResult.stepType === "initial" ? 0 : 1,
					stepType: stepResult.stepType,
					finishReason: stepResult.finishReason,
					usage: stepResult.usage,
					toolCallsCount: stepResult.toolCalls?.length || 0,
				});

				// Log tool calls (if any) for this step
				if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
					logger.info("Tool calls initiated", {
						toolCalls: stepResult.toolCalls.map((call) => ({
							toolName: call.toolName,
							args: call.args,
							toolCallId: call.toolCallId,
						})),
					});
				}

				// Log each tool call individually with structured data
				for (const toolResult of stepResult.toolResults) {
					logger.info("Tool execution completed", {
						toolName: toolResult.toolName,
						toolArgs: toolResult.args,
						toolResultType: toolResult.type,
						toolResult: toolResult.result,
						executionSuccess: toolResult.type === "tool-result",
					});
				}
			},
		});
	};
}
