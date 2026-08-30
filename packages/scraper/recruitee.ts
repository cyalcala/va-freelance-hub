/**
 * SP-15 — Recruitee company XML feed adapter (pure parsing, plus a thin
 * fetch wrapper). A genuinely new adapter — Recruitee is not one of the
 * five platforms in `AtsPlatform` (packages/scraper/ats.ts). This file
 * intentionally does not extend that union or touch scrape.ts's existing
 * ATS fetch loop, keeping this unit self-contained and non-invasive.
 *
 * Per the plan's explicit direction: this targets the **XML feed**, not
 * Recruitee's separate, token-gated "Careers Site API"
 * (docs.recruitee.com/reference/intro-to-careers-site-api). Three feed
 * formats exist on the `{company}.recruitee.com` domain (verified live via
 * support.recruitee.com/en/articles/8213076-faq-api): `/api/offers`
 * (public JSON, simple), `/api/offers.xml` (raw XML), and
 * `/api/feeds/offers.xml` ("formatted" XML, the richest schema — locations,
 * salary, department, employment fields — used here).
 *
 * Official docs confirm "only published offers are visible in the feed;
 * they disappear when their status is changed" and "all currently
 * published jobs are visible... no pagination" — the feed's own
 * construction is the visibility filter, and one fetch returns everything.
 *
 * Verified live against a real feed (myjewellery.recruitee.com): each
 * `<offer>` carries full HTML `<description>`/`<requirements>`/
 * `<highlight>` content — actively discarded here, matching the
 * minimal-content precedent set by `fetchGreenhouse`. A `<mailbox_email>`
 * field (a job-specific application-routing address) is also present and
 * deliberately excluded — out of scope for a public job index. `careers_url`
 * (the posting's own view page) is used as the canonical link, matching
 * every other adapter built this session — not `apply_url`, which points
 * directly at the application form.
 */

import { XMLParser } from "fast-xml-parser";
import { decodeHtmlEntities } from "./text";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  htmlEntities: true,
});

export function recruiteeFeedUrl(companySubdomain: string): string {
  return `https://${companySubdomain}.recruitee.com/api/feeds/offers.xml`;
}

export interface NormalizedRecruiteePosting {
  id: string;
  title: string;
  careersUrl: string;
  postedAt: string | null;
  locationSummary: string | null;
  remote: boolean;
  hybrid: boolean;
  onSite: boolean;
  department: string | null;
  employmentType: string | null;
}

function textOrNull(v: unknown): string | null {
  if (typeof v === "string") {
    const t = decodeHtmlEntities(v).trim();
    return t === "" ? null : t;
  }
  return null;
}

function normalizeDate(rawDate: unknown): string | null {
  if (typeof rawDate !== "string" || !rawDate) return null;
  // Recruitee dates look like "2026-08-27 12:50:16 UTC" — space-separated,
  // not strict ISO. Normalize the separator so Date.parse handles it
  // reliably rather than relying on engine-specific loose parsing.
  const iso = rawDate.trim().replace(" ", "T").replace(/ UTC$/, "Z");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function asBool(v: unknown): boolean {
  return v === true || v === "true";
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

interface RawRecruiteeLocation {
  city?: string;
  country?: string;
  name?: string;
}

interface RawRecruiteeOffer {
  id?: string | number;
  title?: string;
  careers_url?: string;
  published_at?: string;
  city?: string;
  country?: string;
  remote?: boolean | string;
  hybrid?: boolean | string;
  on_site?: boolean | string;
  department?: string;
  employment_type_code?: string;
  locations?: { location?: RawRecruiteeLocation | RawRecruiteeLocation[] };
}

function summarizeLocations(offer: RawRecruiteeOffer): string | null {
  const nested = asArray(offer.locations?.location);
  if (nested.length > 0) {
    const parts = nested
      .map((l) => [textOrNull(l.city), textOrNull(l.country)].filter((s): s is string => s !== null).join(", "))
      .filter((s) => s !== "");
    if (parts.length > 0) return parts.join(" / ");
  }
  // Fall back to the offer's own top-level city/country if the nested
  // locations list is empty or unparseable.
  const top = [textOrNull(offer.city), textOrNull(offer.country)].filter((s): s is string => s !== null).join(", ");
  return top !== "" ? top : null;
}

/** Pure. Never includes description/requirements/highlight (full HTML
 * content) or mailbox_email — both actively excluded. */
export function parseRecruiteeXml(xmlText: string): NormalizedRecruiteePosting[] {
  let doc: any;
  try {
    doc = parser.parse(xmlText);
  } catch {
    return [];
  }
  const offers: RawRecruiteeOffer[] = asArray(doc?.offers?.offer);
  return offers
    .filter((o) => (o?.id !== undefined && o?.id !== null) && typeof o?.title === "string" && typeof o?.careers_url === "string")
    .map((o) => ({
      id: String(o.id),
      title: decodeHtmlEntities(o.title as string).trim(),
      careersUrl: o.careers_url as string,
      postedAt: normalizeDate(o.published_at),
      locationSummary: summarizeLocations(o),
      remote: asBool(o.remote),
      hybrid: asBool(o.hybrid),
      onSite: asBool(o.on_site),
      department: textOrNull(o.department ?? null),
      employmentType: textOrNull(o.employment_type_code ?? null),
    }));
}

/** No pagination exists for this feed — official docs confirm one fetch
 * returns every currently-published offer. */
export async function fetchRecruiteeFeed(
  companySubdomain: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<{ postings: NormalizedRecruiteePosting[] }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(recruiteeFeedUrl(companySubdomain));
  if (!res.ok) throw new Error(`Recruitee HTTP ${res.status}`);
  const xmlText = await res.text();
  return { postings: parseRecruiteeXml(xmlText) };
}
