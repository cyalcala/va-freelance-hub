import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { JOB_CATEGORY_MAP, parseJobCategory } from "../src/lib/categories";

/**
 * `/categories/[category]` and `/opportunities` both take a category from a
 * public URL and used to accept it with a plain truthiness lookup:
 * `!JOB_CATEGORY_MAP[category]`. That expression walks the prototype chain, so
 * every `Object.prototype` member name ("constructor", "toString", "__proto__",
 * ...) passed the guard, the route then read `.title.toLowerCase()` off a
 * function, and the page threw a 500 — on `/categories/[category]` after the
 * `count()` and paged `select()` had already been paid for.
 *
 * `parseJobCategory` is the one own-property definition of "is this a real
 * board category", and these tests lock the behaviour plus the wiring.
 */

/** Names that exist on `Object.prototype` and on none of the board categories. */
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

const ROUTE_SURFACES = [
  "src/pages/categories/[category].astro",
  "src/pages/opportunities.astro",
  "src/pages/jobs/[id].astro",
];

function readRouteSource(surface: string): string {
  return readFileSync(resolve(import.meta.dir, "../", surface), "utf8");
}

describe("own-property job category guard", () => {
  test("rejects inherited Object.prototype member names instead of walking the prototype chain", () => {
    for (const key of INHERITED_OBJECT_KEYS) {
      expect({ key, parsed: parseJobCategory(key) }).toEqual({ key, parsed: null });
    }
  });

  test("a rejected prototype name never yields a title the route can lower-case", () => {
    for (const key of INHERITED_OBJECT_KEYS) {
      const parsed = parseJobCategory(key);
      expect(parsed).toBeNull();
      expect(parsed ? parsed.title.toLowerCase() : null).toBeNull();
    }
  });

  test("absent, empty and genuinely unknown categories are rejected", () => {
    expect(parseJobCategory(undefined)).toBeNull();
    expect(parseJobCategory(null)).toBeNull();
    expect(parseJobCategory("")).toBeNull();
    expect(parseJobCategory("  ")).toBeNull();
    expect(parseJobCategory("not-a-category")).toBeNull();
    expect(parseJobCategory("<script>")).toBeNull();
    expect(parseJobCategory("Tech")).toBeNull();
  });

  test("every own category key still resolves to its own slug, title and color", () => {
    for (const key of Object.keys(JOB_CATEGORY_MAP)) {
      expect(parseJobCategory(key)).toEqual({ slug: key, ...JOB_CATEGORY_MAP[key] });
    }
  });

  test("the accepted set is exactly the map's own keys, nothing inherited", () => {
    const accepted = [...INHERITED_OBJECT_KEYS, "ai", "writing", "nope"]
      .map((key) => parseJobCategory(key)?.slug)
      .filter((slug): slug is string => slug !== undefined);
    expect(accepted).toEqual(["ai", "writing"]);
  });

  test("an inherited name really would have resolved under the old truthiness check", () => {
    // Guards the premise of this file: if `JOB_CATEGORY_MAP` ever stops carrying
    // `Object.prototype` members (null prototype, a Map, a frozen copy), the
    // tests above would pass for the wrong reason.
    expect(typeof (JOB_CATEGORY_MAP as Record<string, unknown>)["constructor"]).toBe("function");
    expect("constructor" in JOB_CATEGORY_MAP).toBe(true);
    expect(Object.hasOwn(JOB_CATEGORY_MAP, "constructor")).toBe(false);
  });
});

/**
 * Wiring and ordering lock, and explicitly NOT a behaviour proof.
 *
 * `.astro` frontmatter cannot be imported, so the behaviour above is proven
 * against the real exported parser and these assertions only pin that each
 * public surface routes through it, in the right order, and no longer keeps a
 * local prototype-walking lookup of its own. The ordering half matters on its
 * own: the guard has to run before `getDb(...)`, otherwise a malformed
 * category still costs two production D1 row reads before it is refused.
 */
describe("public category surfaces route through the shared guard", () => {
  for (const surface of ROUTE_SURFACES) {
    test(`${surface} calls the shared guard and keeps no local map lookup`, () => {
      const source = readRouteSource(surface);
      expect({ surface, callsGuard: source.includes("parseJobCategory(") }).toEqual({
        surface,
        callsGuard: true,
      });
      expect({ surface, inlinesMapLookup: source.includes("JOB_CATEGORY_MAP[") }).toEqual({
        surface,
        inlinesMapLookup: false,
      });
    });
  }

  test("the category route refuses an unknown category before it opens a D1 binding", () => {
    const source = readRouteSource("src/pages/categories/[category].astro");
    // The invariant is about the REFUSAL, not the parse: parsing early and only
    // acting on it after the read would still spend the two row reads.
    const refusalAt = source.indexOf("return Astro.redirect('/');");
    const bindingAt = source.indexOf("getDb(Astro.locals.runtime.env)");
    expect(refusalAt).toBeGreaterThan(-1);
    expect(bindingAt).toBeGreaterThan(-1);
    expect({ refusalBeforeBinding: refusalAt < bindingAt }).toEqual({
      refusalBeforeBinding: true,
    });
  });

  test("the board route filters on the validated slug, never the raw query value", () => {
    const source = readRouteSource("src/pages/opportunities.astro");
    expect({
      bindsRawCategory: /eq\(opportunities\.category,\s*category\)/.test(source),
    }).toEqual({ bindsRawCategory: false });
    expect(source).toContain("selectedCategory.slug");
  });

  test("the directory route refuses an unknown category before it reads the listing", () => {
    const source = readRouteSource("src/pages/directory.astro");
    const refusalAt = source.indexOf("'Unknown directory category.'");
    const readAt = source.indexOf("await loadDirectoryPage(");
    expect(refusalAt).toBeGreaterThan(-1);
    expect(readAt).toBeGreaterThan(-1);
    expect({ refusalBeforeRead: refusalAt < readAt }).toEqual({ refusalBeforeRead: true });
  });
});
