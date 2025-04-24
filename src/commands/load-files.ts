import { defineCommand } from "citty";
import { loadMarkdownFilesFromGlob } from "../data-loader.ts";
import { logger } from "../logger.ts";

export default defineCommand({
	meta: {
		name: "load-files",
		description: "Loads and indexes Markdown files",
	},
	args: {
		glob: {
			type: "positional",
			description: "Glob pattern for the files to load",
			required: true,
		},
	},
	async run({ args }) {
		logger.debug("Received command to load files for a glob: %s", args.glob);
		await loadMarkdownFilesFromGlob(args.glob);
		logger.info("Loading files done.");
		return;
	},
});
