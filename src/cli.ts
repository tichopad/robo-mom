import { defineCommand, runMain } from "citty";
import { runApp } from "./app.tsx";
import loadFilesCommand from "./commands/load-files.ts";
import chatCommand from "./commands/chat.ts";

const main = defineCommand({
	meta: {
		name: "robo-mom",
		version: "1.0.0",
		description: "Your personal AI notes assistant",
	},
	subCommands: {
		chat: chatCommand,
		"load-files": loadFilesCommand,
	},
});

runMain(main);
