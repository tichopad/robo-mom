import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { inspect } from "node:util";

const aboutUser = tool({
	description: "Basic information about a user.",
	parameters: z.object({
		name: z.string().describe("Name of the user."),
	}),
	execute: async ({ name }) => {
		return {
			name,
			info: "The user's 33 year old developer from Ostrava, Czechia.",
		};
	},
});

const { text, toolCalls, toolResults } = await generateText({
	model: openai("o4-mini"),
	tools: {
		aboutUser,
	},
	maxSteps: 2,
	prompt: "What do you know about Michael?",
});

console.log("text: %s", text);
console.log("toolCalls: %o", toolCalls);
console.log("toolResults: %o", toolResults);
