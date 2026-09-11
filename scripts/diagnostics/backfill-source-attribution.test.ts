import { describe, expect, test } from "bun:test";
import {
  DETERMINISTIC_ATTRIBUTION_RULES,
  generateAttributionCountSql,
  generateAttributionUpdateSql,
} from "./backfill-source-attribution";

describe("backfill-source-attribution", () => {
  test("rules array covers key high-volume platforms", () => {
    const platforms = DETERMINISTIC_ATTRIBUTION_RULES.map((r) => r.sourcePlatform);
    expect(platforms).toContain("WeWorkRemotely");
    expect(platforms).toContain("RealWorkFromAnywhere");
    expect(platforms).toContain("RemoteOK");
    expect(platforms).toContain("Remotive");
    expect(platforms).toContain("20Four7VA");
    expect(platforms).toContain("Sourcefit");
    expect(platforms).toContain("Jobicy");
    expect(platforms).toContain("Supabase");
    expect(platforms).toContain("GitLab");
    expect(platforms).toContain("Grafana Labs");
  });

  test("generateAttributionCountSql produces safe read-only query", () => {
    const rule = DETERMINISTIC_ATTRIBUTION_RULES[0];
    const sql = generateAttributionCountSql(rule);
    expect(sql).toContain("SELECT 'we-work-remotely'");
    expect(sql).toContain("source_id IS NULL");
    expect(sql).toContain("source_platform = 'WeWorkRemotely'");
    expect(sql).toContain("COUNT(*)");
    expect(sql).not.toContain("UPDATE");
    expect(sql).not.toContain("DELETE");
  });

  test("generateAttributionUpdateSql produces targeted update statement", () => {
    const rule = DETERMINISTIC_ATTRIBUTION_RULES[0];
    const sql = generateAttributionUpdateSql(rule);
    expect(sql).toContain("UPDATE opportunities SET source_id = 'we-work-remotely'");
    expect(sql).toContain("source_id IS NULL");
    expect(sql).toContain("source_platform = 'WeWorkRemotely'");
    expect(sql).toContain("source_url LIKE 'https://weworkremotely.com/%'");
  });

  test("Jobicy rules distinguish admin and customer support by tags", () => {
    const jobicyRules = DETERMINISTIC_ATTRIBUTION_RULES.filter(
      (r) => r.sourcePlatform === "Jobicy"
    );
    expect(jobicyRules.length).toBe(2);

    const adminRule = jobicyRules.find((r) => r.targetSourceId === "jobicy-admin-support-apac");
    expect(adminRule).toBeDefined();
    expect(adminRule?.tagPattern).toContain("admin");

    const csRule = jobicyRules.find((r) => r.targetSourceId === "jobicy-supporting-apac");
    expect(csRule).toBeDefined();
    expect(csRule?.tagPattern).toContain("customer-support");
  });
});
