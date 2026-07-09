// Shared text/XML normalization helpers for scrapers (2026-07 audit).
//
// Two silent-failure classes lived in the per-file copies these replace:
// 1. decodeHtmlEntities called String.fromCodePoint on unvalidated numeric
//    entities — a single malformed/hostile entity like &#1114112; threw a
//    RangeError inside the item map, which rejected the WHOLE feed's fetch:
//    every valid job in that source was discarded for the run, on every run,
//    until the bad item rotated out of the feed.
// 2. RSS <category> elements that carry attributes parse (with
//    ignoreAttributes: false) into objects like {'@_domain': ..., '#text':
//    'Design'}; String(obj) stored the literal tag "[object Object]".

const MAX_CODE_POINT = 0x10ffff;

/** Convert a numeric character reference safely; returns '' for invalid code points. */
export function safeFromCodePoint(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > MAX_CODE_POINT) return "";
  // Lone surrogates are not valid scalar values; drop them rather than emit garbage.
  if (code >= 0xd800 && code <= 0xdfff) return "";
  return String.fromCodePoint(code);
}

/** Decode common HTML entities without ever throwing on hostile input. */
export function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_match, code) => safeFromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => safeFromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Unwrap a fast-xml-parser text node: plain string, or an attributed node
 * shaped {'#text': string, '@_attr': ...}. Returns null when no usable text.
 */
export function xmlNodeText(node: unknown): string | null {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (node && typeof node === "object") {
    const text = (node as Record<string, unknown>)["#text"];
    if (typeof text === "string") return text;
    if (typeof text === "number") return String(text);
  }
  return null;
}

/** Normalize a category-like node (string | attributed object | array of either) to clean strings. */
export function xmlTextList(node: unknown): string[] {
  const list = Array.isArray(node) ? node : node != null ? [node] : [];
  return list
    .map((entry) => xmlNodeText(entry))
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .map((s) => s.trim());
}
