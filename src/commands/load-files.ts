import { defineCommand } from "citty";
import { loadMarkdownFilesFromGlob } from "../data-loader.ts";
import { logger } from "../logger.ts";
import { print } from "../print.ts";

export default defineCommand({
	meta: {
		name: "load-files",
		description: "Loads and indexes Markdown files",
	},
	args: {
		glob: {
			type: "positional",
			// Some shells will interpret the glob pattern and will return array of files
			// instead of a string if the glob pattern is not wrapped in quotes
			description:
				"Path to the files to load (can be a glob pattern wrapped in quotes)",
			required: true,
			valueHint: "example_notes/**/*.md",
		},
	},
	async run({ args, data, rawArgs, cmd }) {
		const start = performance.now();
		logger.debug("Received command to load files for a glob: %s", args.glob);
		await loadMarkdownFilesFromGlob(args.glob);
		const end = performance.now();
		print.success("Loading files done in %d ms", Math.floor(end - start));
		return;
	},
});
