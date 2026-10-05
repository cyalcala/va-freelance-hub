import { describe, expect, test } from "bun:test";
import {
  DIRECTORY_CATEGORY_INFO,
  DIRECTORY_NICHES,
  isDirectoryNiche,
  parseDirectoryCategory,
} from "../src/lib/directory-categories";

/**
 * Names that exist on `Object.prototype` but on none of the curated categories.
 * A `value in RECORD` check answers `true` for every one of them.
 */
const INHERITED_OBJECT_KEYS = [
  "constructor",
  "toString",
  "toLocaleString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "__proto__",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
] as const;

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

  test("rejects inherited Object.prototype member names instead of walking the prototype chain", () => {
    for (const key of INHERITED_OBJECT_KEYS) {
      expect(parseDirectoryCategory(key)).toBeNull();
    }
  });

  test("a rejected prototype name never yields a category label the route can read", () => {
    for (const key of INHERITED_OBJECT_KEYS) {
      const parsed = parseDirectoryCategory(key);
      expect(parsed).toBeNull();
      expect(parsed ? DIRECTORY_CATEGORY_INFO[parsed].shortTitle : null).toBeNull();
    }
  });

  test("own keys still resolve after the inherited names are rejected", () => {
    for (const category of Object.keys(DIRECTORY_CATEGORY_INFO)) {
      expect(parseDirectoryCategory(category)).toBe(category as never);
    }
  });
});
