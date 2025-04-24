import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "./client.ts";

try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Tables migrated!");
} catch (error) {
  console.error("Error performing migration: ", error);
}
