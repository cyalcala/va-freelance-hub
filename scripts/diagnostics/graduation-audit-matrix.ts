import { execSync } from "child_process";
import { ADMISSION_POLICY } from "../../packages/scraper/admission-evidence";

interface SourceRow {
  source_id: string;
  provider_id: string;
  display_name: string;
  endpoint_url: string;
  company_token: string | null;
  compliance_state: string;
  operational_state: string;
  canary_max_new_items_per_tick: number | null;
  governance_revision: number;
  policy_expiry: string | null;
  last_decision: string | null;
  last_transition_hash: string | null;
}

interface ObsRow {
  id: number;
  source_id: string;
  provider_id: string;
  observed_at: string;
  outcome: string;
  plausible_items: number;
  request_count: number;
  bytes_received: number;
  item_count: number;
  evidence_hash: string;
  admission_evidence_id: number;
  shadow_entry_hash: string;
  dispatch_key: string;
}

function queryD1(sql: string): any[] {
  const cmd = `bun run --cwd apps/web wrangler d1 execute DB --remote --env production --command "${sql.replace(/"/g, '\\"')}"`;
  const output = execSync(cmd, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  const startIdx = output.indexOf("[");
  if (startIdx === -1) throw new Error("No JSON in output: " + output);
  const parsed = JSON.parse(output.slice(startIdx));
  return parsed[0]?.results ?? [];
}

async function main() {
  console.log("Fetching source_registry and source_shadow_observations from remote D1...");
  const sources: SourceRow[] = queryD1(
    "SELECT source_id, provider_id, display_name, endpoint_url, company_token, compliance_state, operational_state, canary_max_new_items_per_tick, governance_revision, policy_expiry, last_decision, last_transition_hash FROM source_registry ORDER BY operational_state, source_id;"
  );

  const observations: ObsRow[] = queryD1(
    "SELECT id, source_id, provider_id, observed_at, outcome, plausible_items, request_count, bytes_received, item_count, evidence_hash, admission_evidence_id, shadow_entry_hash, dispatch_key FROM source_shadow_observations ORDER BY observed_at ASC, id ASC;"
  );

  const nowMs = Date.parse("2026-09-24T00:55:00+08:00"); // 2026-09-23T16:55:00Z
  const nowIso = new Date(nowMs).toISOString();

  const obsBySource = new Map<string, ObsRow[]>();
  for (const obs of observations) {
    const list = obsBySource.get(obs.source_id) ?? [];
    list.push(obs);
    obsBySource.set(obs.source_id, list);
  }

  console.log(`Loaded ${sources.length} sources and ${observations.length} observations.`);
  console.log("\n=========================================================================================");
  console.log("SEPTEMBER 24, 2026 SOURCE GRADUATION AUDIT MATRIX");
  console.log("=========================================================================================\n");

  const results = [];

  for (const source of sources) {
    const rawObs = obsBySource.get(source.source_id) ?? [];
    const healthyObs = rawObs.filter((o) =>
      ["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY"].includes(o.outcome)
    );
    const rateLimitedObs = rawObs.filter((o) => o.outcome === "RATE_LIMITED");
    const otherErrors = rawObs.filter(
      (o) => !["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY", "RATE_LIMITED"].includes(o.outcome)
    );

    // Group healthy by calendar day
    const dayMap = new Map<string, ObsRow>();
    for (const obs of healthyObs) {
      const day = obs.observed_at.slice(0, 10);
      const existing = dayMap.get(day);
      if (!existing || obs.id < existing.id) {
        dayMap.set(day, obs);
      }
    }
    const selectedDays = [...dayMap.values()].sort((a, b) =>
      a.observed_at.localeCompare(b.observed_at)
    );
    const firstHealthy = selectedDays[0] ?? null;
    const lastHealthy = selectedDays[selectedDays.length - 1] ?? null;

    const spanMs =
      firstHealthy && lastHealthy
        ? Math.max(0, Date.parse(lastHealthy.observed_at) - Date.parse(firstHealthy.observed_at))
        : 0;
    const spanDays = Number((spanMs / 86_400_000).toFixed(2));
    const distinctDays = selectedDays.length;

    const minDaysPassed = distinctDays >= ADMISSION_POLICY.minimumDays;
    const minSpanPassed = spanMs >= ADMISSION_POLICY.minimumSpanMs;
    const latestAgeMs = lastHealthy ? nowMs - Date.parse(lastHealthy.observed_at) : Infinity;
    const freshnessPassed = latestAgeMs <= ADMISSION_POLICY.maximumLatestAgeMs;
    const maxPlausible = rawObs.reduce((max, o) => Math.max(max, o.plausible_items || 0), 0);
    const hasPlausibleResults = maxPlausible > 0;

    // Disqualifying check following start of qualifying window:
    const disqualifyingAfterFirst = firstHealthy
      ? rawObs.filter(
          (o) =>
            o.observed_at >= firstHealthy.observed_at &&
            !["HEALTHY_WITH_RESULTS", "HEALTHY_EMPTY"].includes(o.outcome)
        )
      : [];

    const isClean = disqualifyingAfterFirst.length === 0;

    let disposition: "GRADUATE_TO_PRODUCTION" | "REMAIN_CANARY" | "PROMOTE_TO_CANARY" | "RETURN_TO_SHADOW" | "QUARANTINE" | "BLOCKED_BY_INFRASTRUCTURE" | "CANDIDATE_HOLD";
    let blocker = "None";

    if (source.operational_state === "canary") {
      // Source was already in canary
      if (minDaysPassed && minSpanPassed && freshnessPassed && hasPlausibleResults && isClean) {
        disposition = "GRADUATE_TO_PRODUCTION";
      } else if (!isClean) {
        disposition = "RETURN_TO_SHADOW";
        blocker = `Disqualifying observations: ${disqualifyingAfterFirst.length}`;
      } else {
        disposition = "REMAIN_CANARY";
        blocker = `Pending criteria (days=${distinctDays}/8, span=${spanDays}/7d, fresh=${freshnessPassed})`;
      }
    } else if (source.operational_state === "shadow") {
      if (minDaysPassed && minSpanPassed && freshnessPassed && hasPlausibleResults && isClean) {
        // Can graduate to Canary or Production
        disposition = "GRADUATE_TO_PRODUCTION";
      } else if (rateLimitedObs.length > 0 && !isClean) {
        disposition = "RETURN_TO_SHADOW";
        blocker = `Rate limit debt (${rateLimitedObs.length} 429s)`;
      } else if (rawObs.length === 0) {
        disposition = "BLOCKED_BY_INFRASTRUCTURE";
        blocker = "Zero observations recorded";
      } else {
        disposition = "RETURN_TO_SHADOW";
        blocker = `Incomplete observation (${distinctDays}/${ADMISSION_POLICY.minimumDays} days, ${spanDays}/7.00d span)`;
      }
    } else {
      disposition = "CANDIDATE_HOLD";
      blocker = source.compliance_state === "needs_review" ? "Awaiting partner feed or manual adjudication" : "Candidate unadmitted";
    }

    results.push({
      sourceId: source.source_id,
      providerId: source.provider_id,
      operationalState: source.operational_state,
      totalObs: rawObs.length,
      distinctDays,
      spanDays,
      healthyObs: healthyObs.length,
      rateLimited: rateLimitedObs.length,
      otherErrors: otherErrors.length,
      maxPlausible,
      firstObs: rawObs[0]?.observed_at ?? "N/A",
      lastObs: rawObs[rawObs.length - 1]?.observed_at ?? "N/A",
      disqualifyingCount: disqualifyingAfterFirst.length,
      disposition,
      blocker,
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
