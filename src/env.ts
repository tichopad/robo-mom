import { z } from "zod";

const envSchema = z.object({
	CONSOLA_LEVEL: z
		.enum(["0", "1", "2", "3", "4", "5", "999", "-999"])
		.default("2")
		.transform((val) => Number.parseInt(val)),
});
export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
