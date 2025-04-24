import { defineCommand, runMain } from "citty";
import loadFilesCommand from "./commands/load-files.ts";
import queryCommand from "./commands/query.ts";

const main = defineCommand({
	meta: {
		name: "robo-mom",
		version: "1.0.0",
		description: "Your personal AI notes assistant",
	},
	subCommands: {
		"load-files": loadFilesCommand,
		query: queryCommand,
	},
});

runMain(main);
