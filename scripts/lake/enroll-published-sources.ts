/**
 * Puts auto-approved lake sources onto the shadow clock, then asks the
 * promotion gateway for canary. The gateway still requires the shadow window.
 * A 409 means "not yet", not a human task.
 */
import { getLakeClient } from "./client";

export type EnrollDisposition = "enrolled" | "waiting" | "skipped" | "failed";

export function interpretEnrollStatus(status: number, bodyText: string): EnrollDisposition {
  if (status === 200) return "enrolled";
  if (status === 409 || status === 404) return "waiting";
  if (status === 400 && /allowlist/i.test(bodyText)) return "skipped";
  return "failed";
}

interface EndpointResult {
  sourceId: string;
  step: "admit" | "promote";
  status: number;
  disposition: EnrollDisposition;
  detail: string;
}

async function postJson(url: string, secret: string, body: Record<string, string>): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

export async function enrollPublishedSources(options: {
  admitUrl: string;
  promoteUrl: string;
  secret: string;
  sourceIds: string[];
  fetchImpl?: typeof postJson;
}): Promise<EndpointResult[]> {
  const send = options.fetchImpl ?? postJson;
  const results: EndpointResult[] = [];
  for (const sourceId of options.sourceIds) {
    const admitted = await send(options.admitUrl, options.secret, { sourceId });
    results.push({
      sourceId,
      step: "admit",
      status: admitted.status,
      disposition: interpretEnrollStatus(admitted.status, admitted.text),
      detail: admitted.text.slice(0, 300),
    });
    const promoted = await send(options.promoteUrl, options.secret, { sourceId, to: "canary" });
    results.push({
      sourceId,
      step: "promote",
      status: promoted.status,
      disposition: interpretEnrollStatus(promoted.status, promoted.text),
      detail: promoted.text.slice(0, 300),
    });
  }
  return results;
}

async function loadAutoApprovedSourceIds(): Promise<string[]> {
  const client = getLakeClient();
  const res = await client.execute(`
    SELECT source_id FROM lake_ats_discovery
    WHERE review_status = 'auto_approved' AND source_id <> ''
    ORDER BY source_id;
  `);
  return res.rows.map((row) => String(row.source_id ?? "")).filter((id) => id.length > 0);
}

if (import.meta.main) {
  const secret = process.env.PROXY_SECRET || process.env.CRON_SECRET || "";
  const admitUrl = process.env.SOURCE_ADMIT_URL ?? "https://remotejobs-ph.pages.dev/api/cron/source-admit";
  const promoteUrl = process.env.SOURCE_PROMOTE_URL ?? "https://remotejobs-ph.pages.dev/api/cron/source-promote";
  if (!secret) {
    console.log("Enroll skipped: PROXY_SECRET is not configured.");
    process.exit(0);
  }
  const sourceIds = await loadAutoApprovedSourceIds();
  if (sourceIds.length === 0) {
    console.log("Enroll skipped: no auto-approved lake sources.");
    process.exit(0);
  }
  const results = await enrollPublishedSources({ admitUrl, promoteUrl, secret, sourceIds });
  let failed = 0;
  for (const result of results) {
    console.log(`[enroll] ${result.sourceId} ${result.step} ${result.status} ${result.disposition} ${result.detail}`);
    if (result.disposition === "failed") failed += 1;
  }
  if (failed > 0) process.exit(1);
}
