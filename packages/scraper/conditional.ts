// Conditional HTTP fetch (freshness masterplan Phase-2 core, 2026-07).
//
// Sends If-None-Match / If-Modified-Since using validators stored per source,
// and additionally hashes the body so a 200 that returns identical content is
// treated as "not modified" too (many feeds don't send ETags). When a feed is
// unchanged the caller skips parse + triage entirely — less work for us AND
// less load on the third-party source (compliance-positive).

import type { NewOpportunity } from "@va-hub/db";
import { hashString } from "./contentHash";

export interface ConditionalState {
  etag?: string | null;
  lastModified?: string | null;
  lastBodyHash?: string | null;
}

/** What a feed fetcher returns: parsed items plus fresh conditional validators. */
export interface SourceFetchOutput {
  items: NewOpportunity[];
  /** True when the feed was unchanged and items were NOT re-parsed. */
  notModified: boolean;
  etag: string | null;
  lastModified: string | null;
  bodyHash: string | null;
}

/** Build an unchanged-feed output that carries the prior validators forward. */
export function unchangedOutput(state: ConditionalState | undefined): SourceFetchOutput {
  return {
    items: [],
    notModified: true,
    etag: state?.etag ?? null,
    lastModified: state?.lastModified ?? null,
    bodyHash: state?.lastBodyHash ?? null,
  };
}

export interface ConditionalResult {
  /** True when the body is unchanged (HTTP 304 or an identical body hash). */
  notModified: boolean;
  /** The response body text (empty string when notModified via 304). */
  text: string;
  /** Fresh validators to persist for next time. */
  etag: string | null;
  lastModified: string | null;
  bodyHash: string | null;
  status: number;
}

/**
 * Fetch `url` with conditional headers derived from `state`. Never throws for a
 * 304 — that is the success path. Non-2xx/304 responses still throw so the
 * source is reported as failed (not silently empty).
 */
export async function conditionalFetchText(
  url: string,
  baseHeaders: Record<string, string>,
  state: ConditionalState | undefined,
  timeoutMs = 15_000,
): Promise<ConditionalResult> {
  const headers: Record<string, string> = { ...baseHeaders };
  if (state?.etag) headers["If-None-Match"] = state.etag;
  if (state?.lastModified) headers["If-Modified-Since"] = state.lastModified;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });

  if (res.status === 304) {
    return {
      notModified: true,
      text: "",
      etag: state?.etag ?? null,
      lastModified: state?.lastModified ?? null,
      bodyHash: state?.lastBodyHash ?? null,
      status: 304,
    };
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  const bodyHash = hashString(text);
  const etag = res.headers.get("etag");
  const lastModified = res.headers.get("last-modified");
  const notModified = !!state?.lastBodyHash && state.lastBodyHash === bodyHash;

  return { notModified, text, etag, lastModified, bodyHash, status: res.status };
}
