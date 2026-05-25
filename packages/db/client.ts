import { drizzle as drizzleD1, type DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function getDb(env?: any): DrizzleD1Database<typeof schema> {
  if (env && env.DB) {
    return drizzleD1(env.DB, { schema });
  }

  // Fallback for local scripts (push/seed/check) or local development when D1 is not available.
  try {
    const isNode = typeof process !== "undefined" && process.versions && process.versions.node;
    const isBun = typeof Bun !== "undefined";
    if (isNode || isBun) {
      // Dynamic require using a non-literal key to prevent bundlers like Webpack or esbuild 
      // from resolving and bundling @libsql/client when compiled for edge workers.
      try {
        let requireFn = typeof require !== "undefined" ? require : undefined;
        if (!requireFn && typeof process !== "undefined" && process.versions && process.versions.node) {
           // We are in Node ESM, use dynamic eval or bypass
           // For local scripts we usually run them with tsx/bun which provide require or we can just ignore
        }
        if (requireFn) {
          const pkg = ["@libsql", "client"].join("/");
          const { createClient } = requireFn(pkg);
          const client = createClient({
            url: process.env.TURSO_DATABASE_URL || "file:local.db",
            authToken: process.env.TURSO_AUTH_TOKEN,
          });
          return drizzleLibsql(client, { schema }) as any;
        }
      } catch (e) {
        // ignore require failures in non-node environments
      }
    }
  } catch (e) {
    console.error("Local database fallback failed:", e);
  }

  throw new Error(
    "Database initialization failed: Cloudflare D1 binding (env.DB) is not present, and local LibSQL/SQLite fallback failed."
  );
}

export { schema };

