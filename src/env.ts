import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const envSchema = z.object({
	/** Log level for the application. */
	LOG_LEVEL: z
		.enum([
			"emerg",
			"alert",
			"crit",
			"error",
			"warning",
			"notice",
			"info",
			"debug",
		])
		.default("info"),
	/** Log file for the application. */
	LOG_FILE: z.string().default("debug.log"),
	/** Gemini API key */
	GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
	/** Database directory */
	DATABASE_DIR: z.string().default(join(homedir(), "/.robo-mom/db")),
});

export const env = envSchema.parse(process.env);
