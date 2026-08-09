const SCRIPT_UNSAFE_CHARACTERS: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/**
 * JSON-LD is emitted into a script element with Astro's raw HTML directive.
 * Escape HTML-significant characters after JSON serialization so untrusted
 * listing content cannot terminate that element.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => SCRIPT_UNSAFE_CHARACTERS[character]);
}
