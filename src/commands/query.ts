import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { defineCommand } from "citty";
import { z } from "zod";
import { logger } from "../logger.ts";
import { queryDocuments } from "../query-documents.ts";

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

		// TODO: Stream the response
		const { text, toolCalls, toolResults } = await generateText({
			model: openai("o4-mini"),
			system: 'You are a helpful assistant that can search for notes and answer questions about them.',
			tools: {
				aboutUser,
				searchNotes,
			},
			maxSteps: 2,
			prompt: query,
		});

		console.log(text)
	},
});

const aboutUser = tool({
	description: "Basic information about a user.",
	parameters: z.object({
		name: z.string().describe("Name of the user."),
	}),
	// TODO: Implement this (search notes looking for chunks with a corresponding frontmatter attribute, e.g. "tags: [about-me]")
	execute: async ({ name }) => {
		return {
			name,
			info: "The user's 33 year old developer from Ostrava, Czechia.",
		};
	},
});

const searchNotes = tool({
	description: "Search for notes about a given query.",
	parameters: z.object({
		query: z.string().describe("The query to search for."),
	}),
	execute: ({ query }) => {
		return queryDocuments(query);
	},
});
