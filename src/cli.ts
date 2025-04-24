import { defineCommand, runMain } from "citty";
import { loadMarkdownFilesFromGlob } from "./data-loader.ts";
import { logger } from "./logger.ts";

const main = defineCommand({
	meta: {
		name: "robo-mom",
		version: "1.0.0",
		description: "Your personal AI notes assistant",
	},
	args: {
		"load-files": {
			type: "string",
			description: "Load markdown files from a glob pattern",
			required: true,
		},
	},
	async run({ args }) {
		if (args["load-files"]) {
			logger.debug(
				"Received command to load files from glob: %s",
				args["load-files"],
			);
			await loadMarkdownFilesFromGlob(args["load-files"]);
			logger.info("Successfully loaded files.");
			return;
		}
	},
});

runMain(main);
