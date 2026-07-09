// Apply-URL sanitization (2026-07 audit).
//
// triage.ts asks the LLM to extract an apply link/email from third-party
// description text and previously the raw model string won precedence over
// verified URLs with only a typeof check — so a hallucinated fragment,
// javascript: URL, or bare email could become the stored application_url.
// Every writer should pass candidates through sanitizeApplyUrl and fall back
// to the verified source URL when the candidate does not survive.

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

// Pragmatic address shape check for mailto: targets — not RFC-complete.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Return a normalized, safe apply URL or null when the candidate is not a
 * usable http(s)/mailto link. Bare email addresses are upgraded to mailto:.
 */
export function sanitizeApplyUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const candidate = raw.trim();
  if (candidate === "" || candidate.length > 2048) return null;

  let url: URL | null = null;
  try {
    url = new URL(candidate);
  } catch {
    url = null;
  }

  if (url) {
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    if (url.protocol === "mailto:") {
      return EMAIL_RE.test(url.pathname) ? `mailto:${url.pathname}` : null;
    }
    if (!url.hostname || !url.hostname.includes(".")) return null;
    return url.toString();
  }

  // Not a parseable URL: accept a bare email extracted from a description.
  if (EMAIL_RE.test(candidate)) return `mailto:${candidate}`;
  return null;
}
