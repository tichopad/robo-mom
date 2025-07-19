import { defineCommand } from "citty";
import { runApp } from "../app.tsx";
import { logger } from "../logger/logger.ts";

export default defineCommand({
	meta: {
		name: "chat",
		description: "Starts a chat session with the assistant.",
	},
	async run() {
		logger.debug("Received command to start a chat session.");
		runApp();
	},
});
