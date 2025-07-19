import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { drizzle } from "drizzle-orm/pglite";
import { env } from "#src/env.ts";
import * as schema from "./schema.ts";

// Using PGlite as the database client
// It's a file-based Postgres database supporting the vector extension
const pgliteClient = new PGlite({
	dataDir: env.DATABASE_DIR,
	extensions: { vector },
});

/** The database client. */
export const db = drizzle({ client: pgliteClient, schema });
