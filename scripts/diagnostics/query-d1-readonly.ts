import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export interface D1ReadResult<Row> {
  results: Row[];
  meta?: { rows_read?: number; rows_written?: number; duration?: number };
}

type Execute = (executable: string, args: string[], cwd: string) => string;

const execute: Execute = (executable, args, cwd) => execFileSync(executable, args, {
  cwd, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, timeout: 60_000,
});

/** Internal SELECTs only, not an arbitrary-SQL security sandbox. Invoke the
 * pinned CLI directly: `bun run wrangler` adds a Windows shell that corrupts
 * multiline arguments; remote --file imports SQL and returns no query rows.
 */
export function queryD1ReadOnly<Row>(sql: string, cwd = process.cwd(), run: Execute = execute): D1ReadResult<Row> {
  const statement = sql.trim().replace(/;$/, "");
  if (!/^SELECT\b/i.test(statement) || statement.includes(";")) {
    throw new Error("read-only diagnostics require a single SELECT statement");
  }
    const output = run("node", [resolve(cwd, "node_modules/wrangler/bin/wrangler.js"), "d1", "execute", "DB",
      "--remote", "--env", "production", "--config", resolve(cwd, "apps/web/wrangler.jsonc"),
      "--command", sql, "--json"], cwd);
    const parsed = JSON.parse(output.trim());
    const result = parsed?.[0];
    if (!Array.isArray(parsed) || parsed.length !== 1 || result?.success !== true || !Array.isArray(result.results)) {
      throw new Error("D1 did not confirm a successful single-query read");
    }
    if (result.meta?.rows_written !== undefined && result.meta.rows_written !== 0) {
      throw new Error("D1 diagnostic returned a nonzero write receipt");
    }
    return { results: result.results, meta: result.meta };
}
