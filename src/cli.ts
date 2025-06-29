import { defineCommand, runMain } from "citty";

const main = defineCommand({
	meta: {
		name: "robo-mom",
		version: "1.0.0",
		description: "Your personal AI notes assistant",
	},
	subCommands: {
		chat: import("./commands/chat.ts").then((m) => m.default),
		"load-files": import("./commands/load-files.ts").then((m) => m.default),
	},
});

runMain(main);
