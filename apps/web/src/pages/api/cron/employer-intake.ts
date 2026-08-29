import type { APIRoute } from "astro";
import { getDb, sourceRegistry, providerProfiles, sourceOptOuts } from "@va-hub/db";
import {
  parseIssueForm,
  buildEmployerCandidateRow,
  checkDuplicate,
  EMPLOYER_PROVIDER_ID,
  EMPLOYER_PROVIDER_FAMILY,
  errorMessage,
} from "@va-hub/scraper";
import { nowUtcIso } from "@/lib/time";
import { isAuthorized } from "@/lib/auth";

export const prerender = false;

// SP-16 (2026-08-29): no-account employer "bring your feed" intake. A GitHub
// Actions workflow (gha-employer-intake.yml) parses a structured issue form
// and POSTs its raw body here. This route re-parses and re-validates
// server-side (never trusts the workflow's own parsing) and, only if the
// submission is valid, new, and not opted out, inserts exactly one
// non-publishing source_registry candidate (needs_review/candidate). It
// never creates a user account, never accepts payment, and never publishes
// anything: a human reviews the candidate like any other Prospector/Doctor
// discovery before it can enter shadow (SP-05's compliance-holds-never-
// auto-promote rule applies identically here).
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;

    const rateLimiter = env?.API_RATE_LIMITER;
    if (rateLimiter) {
      const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await rateLimiter.limit({ key: `employer-intake:${clientIp}` });
      if (!success) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), { status: 429 });
      }
    }

    if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    let payload: { issueNumber?: number; issueUrl?: string; issueBody?: string };
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
    }
    const issueNumber = Number(payload.issueNumber);
    const issueUrl = String(payload.issueUrl ?? "");
    const issueBody = String(payload.issueBody ?? "");
    if (!Number.isFinite(issueNumber) || !issueUrl || !issueBody) {
      return new Response(JSON.stringify({ error: "issueNumber, issueUrl, and issueBody are required" }), { status: 400 });
    }
    // Cap raw body size handed to the parser (defense in depth; GitHub issue
    // bodies are already capped far below this by GitHub itself).
    if (issueBody.length > 65_536) {
      return new Response(JSON.stringify({ outcome: "rejected", errors: ["issue body exceeds 64 KiB — rejected without parsing"] }), { status: 400 });
    }

    const parsed = parseIssueForm(issueBody);
    if (!parsed.ok || !parsed.data) {
      return new Response(JSON.stringify({ outcome: "rejected", errors: parsed.errors }), { status: 200 });
    }

    const db = getDb(env);
    const now = nowUtcIso();
    const row = buildEmployerCandidateRow({ intake: parsed.data, issueNumber, issueUrl, nowIso: now });

    const [registryRows, optOutRows] = await Promise.all([
      db.select({ sourceId: sourceRegistry.sourceId }).from(sourceRegistry),
      db.select({ sourceId: sourceOptOuts.sourceId }).from(sourceOptOuts),
    ]);
    const existingIds = new Set(registryRows.map((r) => r.sourceId));
    const optOutIds = new Set(optOutRows.map((r) => r.sourceId));

    const dedup = checkDuplicate(row.sourceId, existingIds, optOutIds);
    if (dedup.outcome !== "new") {
      return new Response(
        JSON.stringify({ outcome: dedup.outcome, sourceId: row.sourceId, reason: dedup.reason }),
        { status: 200 },
      );
    }

    // Ensure the synthetic "employer-submitted" provider profile exists (FK).
    try {
      await (db.insert(providerProfiles).values({
        id: EMPLOYER_PROVIDER_ID,
        displayName: "Employer-submitted feed",
        providerFamily: EMPLOYER_PROVIDER_FAMILY,
        mechanism: "customer_auth" as any,
        authClass: "none" as any,
        evidenceLeaseDays: 180,
        defaultComplianceState: "needs_review" as any,
        defaultOperationalState: "candidate" as any,
        notes: "Employer/customer self-submitted feed via GitHub issue intake (SP-16). Compliance state always starts needs_review — a human reviews every submission before it can enter shadow.",
      } as any).onConflictDoNothing());
    } catch (provErr) {
      console.warn("[api/cron/employer-intake] provider ensure failed:", errorMessage(provErr));
    }

    try {
      await db.insert(sourceRegistry).values(row as any).onConflictDoNothing();
    } catch (insErr) {
      console.error("[api/cron/employer-intake] candidate insert failed:", errorMessage(insErr));
      return new Response(JSON.stringify({ outcome: "rejected", errors: [`insert failed: ${errorMessage(insErr)}`] }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ outcome: "accepted", sourceId: row.sourceId, reviewDeadline: row.reviewDeadline }),
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/cron/employer-intake] unhandled error:", errorMessage(err));
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
};
