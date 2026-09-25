import { getLakeClient } from "./client";
import { geoGate } from "../../packages/scraper/geoGate";

interface ReplayCandidate {
  id: number;
  source_id: string;
  source_platform: string;
  source_url: string;
  title: string;
  company: string | null;
  location_raw: string | null;
  description: string | null;
  status: string;
  ph_eligibility: string;
}

export async function runHistoricalReplay(ruleVersion = "geoGate-v1.2-refinery") {
  console.log(`\n=== Running Historical Replay in Turso Lake (Rule Version: ${ruleVersion}) ===`);
  const client = getLakeClient();

  // Find all ambiguous or excluded candidates for evaluation
  const res = await client.execute(`
    SELECT id, source_id, source_platform, source_url, title, company, location_raw, description, status, ph_eligibility
    FROM lake_candidate_jobs
    WHERE status IN ('AMBIGUOUS', 'EXCLUDED')
    ORDER BY id ASC;
  `);

  const candidates = res.rows as unknown as ReplayCandidate[];
  console.log(`Evaluating ${candidates.length} candidates in Turso Lake...`);

  let recoveredToQualified = 0;
  let classifiedExcluded = 0;
  let unchanged = 0;

  for (const cand of candidates) {
    const verdict = geoGate({
      title: cand.title,
      description: cand.description || "",
      locationRaw: cand.location_raw || "",
      tags: [],
    });

    let newStatus = cand.status;
    let newEligibility = cand.ph_eligibility;
    let rejectionReason: string | null = null;

    if (verdict.phEligibility === "eligible_verified" || verdict.phEligibility === "eligible_likely") {
      newStatus = "QUALIFIED_READY";
      newEligibility = verdict.phEligibility;
    } else if (verdict.phEligibility === "ineligible") {
      newStatus = "EXCLUDED";
      newEligibility = verdict.phEligibility;
      rejectionReason = verdict.evidence;
    }

    if (newStatus !== cand.status || newEligibility !== cand.ph_eligibility) {
      if (newStatus === "QUALIFIED_READY") {
        recoveredToQualified++;
        console.log(`  [RECOVERED] #${cand.id} "${cand.title}" @ "${cand.company}" -> QUALIFIED_READY (${verdict.evidence})`);
      } else if (newStatus === "EXCLUDED") {
        classifiedExcluded++;
        console.log(`  [EXCLUDED]  #${cand.id} "${cand.title}" @ "${cand.company}" -> EXCLUDED (${verdict.evidence})`);
      }

      // Record immutable replay event
      await client.execute({
        sql: `
          INSERT INTO lake_replay_events (
            candidate_id, original_status, original_ph_eligibility,
            new_status, new_ph_eligibility, rule_version, reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        args: [
          cand.id,
          cand.status,
          cand.ph_eligibility,
          newStatus,
          newEligibility,
          ruleVersion,
          verdict.evidence,
        ],
      });

      // Update candidate in lake
      await client.execute({
        sql: `
          UPDATE lake_candidate_jobs
          SET status = ?,
              ph_eligibility = ?,
              geo_scope = ?,
              geo_evidence = ?,
              rejection_reason = ?
          WHERE id = ?;
        `,
        args: [
          newStatus,
          newEligibility,
          verdict.geoScope,
          verdict.evidence,
          rejectionReason,
          cand.id,
        ],
      });
    } else {
      unchanged++;
    }
  }

  console.log("\n=======================================================");
  console.log("            HISTORICAL REPLAY SUMMARY                 ");
  console.log("=======================================================");
  console.log(`Total Candidates Evaluated:    ${candidates.length}`);
  console.log(`Recovered to QUALIFIED_READY:  ${recoveredToQualified}`);
  console.log(`Classified to EXCLUDED:        ${classifiedExcluded}`);
  console.log(`Unchanged / Still Ambiguous:   ${unchanged}`);
  console.log("=======================================================\n");

  return {
    evaluated: candidates.length,
    recoveredToQualified,
    classifiedExcluded,
    unchanged,
  };
}

if (import.meta.main) {
  runHistoricalReplay().catch((err) => {
    console.error("Historical replay failed:", err);
    process.exit(1);
  });
}
