import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { queryD1ReadOnly } from "./query-d1-readonly";

describe("read-only D1 diagnostic transport", () => {
  test("preserves multiline SQL as one argument to the pinned CLI without a shell", () => {
    const sql = "SELECT source_id, count(*) AS n\nFROM opportunities\nGROUP BY source_id;";
    const result = queryD1ReadOnly<{ n: number }>(sql, process.cwd(), (executable, args) => {
      expect(executable).toBe("node");
      expect(args[0].replaceAll("\\", "/")).toEndWith("/node_modules/wrangler/bin/wrangler.js");
      expect(args).not.toContain("run");
      expect(args).not.toContain("--file");
      expect(args[args.indexOf("--command") + 1]).toBe(sql);
      return JSON.stringify([{ success: true, results: [{ n: 7 }], meta: { rows_read: 10, rows_written: 0 } }]);
    });
    expect(result.results).toEqual([{ n: 7 }]);
    expect(result.meta?.rows_written).toBe(0);
  });

  test("native child receives newlines, quotes and spaced paths unchanged", () => {
    const directory = mkdtempSync(join(tmpdir(), "va hub native argv "));
    const cli = join(directory, "fixture.cjs");
    writeFileSync(cli, `const args = process.argv.slice(2); console.log(JSON.stringify([{success:true,results:[{sql:args[args.indexOf('--command')+1]}],meta:{rows_written:0}}]));`);
    const sql = "SELECT\n 'value with spaces and \"quotes\"' AS n;";
    try {
      const result = queryD1ReadOnly<{ sql: string }>(sql, directory, (executable, args, cwd) =>
        execFileSync(executable, [cli, ...args.slice(1)], { cwd, encoding: "utf8" }));
      expect(result.results[0].sql).toBe(sql);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
    expect(() => queryD1ReadOnly("SELECT 1;", process.cwd(), () => { throw new Error("transport unavailable"); })).toThrow("transport unavailable");
  });

  test("refuses unsuccessful, malformed, multiple or write-producing receipts", () => {
    for (const output of ["not json", "[]", '[{"success":false,"results":[]}]',
      '[{"success":true}]', '[{"success":true,"results":[],"meta":{"rows_written":1}}]',
      '[{"success":true,"results":[]},{"success":true,"results":[]}]']) {
      expect(() => queryD1ReadOnly("SELECT 1;", process.cwd(), () => output)).toThrow();
    }
  });

  test("refuses mutations and multiple statements before launching transport", () => {
    for (const sql of ["UPDATE opportunities SET is_active = 1;", "SELECT 1; DELETE FROM opportunities;", ""]) {
      expect(() => queryD1ReadOnly(sql, process.cwd(), () => { throw new Error("must not execute"); })).toThrow("single SELECT");
    }
  });
});
