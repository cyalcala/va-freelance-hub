import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client);

console.log("Running migrations...");
const migrationsPath = resolve(__dirname, "./migrations");
await migrate(db, { migrationsFolder: migrationsPath });
console.log("Migrations complete.");

client.close();
