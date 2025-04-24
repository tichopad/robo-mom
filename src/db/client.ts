import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import * as schema from "./schema.ts";

export const pgliteClient = new PGlite({
	dataDir: "./database",
	extensions: { vector },
});

export const db = drizzle({ client: pgliteClient, schema });
