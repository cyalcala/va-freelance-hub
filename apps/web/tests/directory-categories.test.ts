import { describe, expect, test } from "bun:test";
import {
  DIRECTORY_CATEGORY_INFO,
  DIRECTORY_NICHES,
  isDirectoryNiche,
  parseDirectoryCategory,
} from "../src/lib/directory-categories";

describe("directory category navigation", () => {
  test("accepts every curated niche and the two focused views", () => {
    for (const niche of DIRECTORY_NICHES) {
      expect(parseDirectoryCategory(niche)).toBe(niche);
      expect(isDirectoryNiche(niche)).toBe(true);
      expect(DIRECTORY_CATEGORY_INFO[niche].description.length).toBeGreaterThan(30);
    }

    expect(parseDirectoryCategory("dayshift")).toBe("dayshift");
    expect(parseDirectoryCategory("marketplaces")).toBe("marketplaces");
    expect(isDirectoryNiche("dayshift")).toBe(false);
  });

  test("rejects unknown or empty category values", () => {
    expect(parseDirectoryCategory(null)).toBeNull();
    expect(parseDirectoryCategory("")).toBeNull();
    expect(parseDirectoryCategory("filipino-owned")).toBeNull();
    expect(parseDirectoryCategory("<script>")).toBeNull();
  });
});
