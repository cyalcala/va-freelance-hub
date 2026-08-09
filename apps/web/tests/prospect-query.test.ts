import { expect, test } from "bun:test";
import {
  PROSPECT_CANDIDATE_FRESHNESS_SQL,
  PROSPECT_SAMPLE_FRESHNESS_SQL,
} from "../src/lib/prospect-query";

test("prospector candidate query uses opportunity timestamp columns that exist", () => {
  expect(PROSPECT_SAMPLE_FRESHNESS_SQL).toBe("COALESCE(o2.scraped_at, o2.posted_at)");
  expect(PROSPECT_CANDIDATE_FRESHNESS_SQL).toBe("COALESCE(o.scraped_at, o.posted_at)");
  expect(PROSPECT_SAMPLE_FRESHNESS_SQL).not.toContain("created_at");
  expect(PROSPECT_CANDIDATE_FRESHNESS_SQL).not.toContain("created_at");
});
