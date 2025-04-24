import { defineCommand } from "citty";
import { loadMarkdownFilesFromGlob } from "../data-loader.ts";
import { logger } from "../logger.ts";
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

export default defineCommand({
	meta: {
		name: "query",
		description: "Query about the loaded notes",
	},
	args: {
		query: {
			type: "positional",
			description: "The query to ask about the loaded notes",
			required: true,
		},
	},
	async run({ args }) {
		const { query } = args;
		logger.info("Querying about the loaded notes: %s", query);

		const { text, toolCalls, toolResults } = await generateText({
			model: openai("o4-mini"),
			tools: {
				aboutUser,
			},
			maxSteps: 2,
			prompt: query,
		});

		console.log("text: %s", text);
		console.log("toolCalls: %o", toolCalls);
		console.log("toolResults: %o", toolResults);
	},
});

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
