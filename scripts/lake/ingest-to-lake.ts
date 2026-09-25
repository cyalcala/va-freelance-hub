import { getLakeClient } from "./client";
import {
  computeFingerprint,
  isStorableCandidate,
  markRawProcessed,
  recordSighting,
  storeRawObservation,
} from "./lake-shared";
import { parseHimalayasResponse, type RawHimalayasResponse } from "../../packages/scraper/himalayas";
import { fetchRSSFeed } from "../../packages/scraper/rss";
import { geoGate } from "../../packages/scraper/geoGate";
import { collectionHeaders } from "../../packages/scraper/userAgent";
import type { Source } from "../../packages/scraper/sources";

export interface CandidateDraft {
  sourceId: string;
  sourcePlatform: string;
  sourceUrl: string;
  title: string;
  company: string;
  category: string;
  locationRaw: string;
  description: string;
  applicationUrl: string;
  postedAt: string | null;
  tags?: string[];
}

export { computeFingerprint };

export async function processAndRefineCandidate(
  client: ReturnType<typeof getLakeClient>,
  rawObsId: number,
  draft: CandidateDraft,
  stats: {
    totalExtracted: number;
    duplicates: number;
    excluded: number;
    qualifiedReady: number;
    ambiguous: number;
  }
) {
  stats.totalExtracted++;
  if (!isStorableCandidate(draft)) {
    stats.excluded++;
    return;
  }
  const fingerprint = computeFingerprint(draft.company, draft.title, draft.applicationUrl || draft.sourceUrl);

  // Check for existing candidate by fingerprint or source URL
  const existing = await client.execute({
    sql: `SELECT id, status, sighting_count FROM lake_candidate_jobs WHERE fingerprint_hash = ? OR source_url = ? LIMIT 1;`,
    args: [fingerprint, draft.sourceUrl],
  });

  if (existing.rows.length > 0) {
    stats.duplicates++;
    const existingId = existing.rows[0]?.id as number;
    const currentCount = Number(existing.rows[0]?.sighting_count || 1);

    // Record multi-source sighting in lake_sightings
    await recordSighting(client, {
      candidateId: existingId,
      rawObservationId: rawObsId,
      sourceId: draft.sourceId,
      sourcePlatform: draft.sourcePlatform,
      sourceUrl: draft.sourceUrl,
      currentCount,
    });

    return;
  }

  // Evaluate candidate through repository's deterministic geoGate
  const verdict = geoGate({
    title: draft.title,
    description: draft.description || "",
    locationRaw: draft.locationRaw || "",
    tags: draft.tags || [],
  });

  let statusCol = "AMBIGUOUS";
  let phEligibility = verdict.phEligibility;
  let rejectionReason: string | null = null;

  if (verdict.phEligibility === "eligible_verified" || verdict.phEligibility === "eligible_likely") {
    statusCol = "QUALIFIED_READY";
    stats.qualifiedReady++;
  } else if (verdict.phEligibility === "ineligible") {
    statusCol = "EXCLUDED";
    rejectionReason = verdict.evidence;
    stats.excluded++;
  } else {
    statusCol = "AMBIGUOUS";
    stats.ambiguous++;
  }

  await client.execute({
    sql: `
      INSERT INTO lake_candidate_jobs (
        raw_observation_id, source_id, source_platform, source_url,
        title, company, category, location_raw, description,
        application_url, posted_at, fingerprint_hash, status,
        geo_scope, ph_eligibility, geo_evidence, rejection_reason,
        sighting_count, last_observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(source_url) DO UPDATE SET
        last_observed_at = datetime('now'),
        sighting_count = sighting_count + 1;
    `,
    args: [
      rawObsId,
      draft.sourceId,
      draft.sourcePlatform,
      draft.sourceUrl,
      draft.title,
      draft.company || "Unknown",
      draft.category || "other",
      draft.locationRaw || "Remote",
      draft.description?.slice(0, 10_000) || "",
      draft.applicationUrl || draft.sourceUrl,
      draft.postedAt,
      fingerprint,
      statusCol,
      verdict.geoScope,
      phEligibility,
      verdict.evidence,
      rejectionReason,
    ],
  });
}

export interface LakeStats {
  totalRawCount: number;
  totalExtracted: number;
  duplicates: number;
  excluded: number;
  qualifiedReady: number;
  ambiguous: number;
}

/**
 * Shared RSS ingestion: fetch -> store raw observation -> refine each item ->
 * mark processed. Error-isolated per source so one feed failure never aborts
 * the pipeline. Exported for reuse by lake sweep scripts.
 */
export async function ingestRssSource(
  client: ReturnType<typeof getLakeClient>,
  source: Source,
  stats: LakeStats,
  toDraft: (item: any, source: Source) => CandidateDraft | null,
  label = source.name
): Promise<void> {
  try {
    const res = await fetchRSSFeed(source);
    console.log(`Parsed ${res.items.length} opportunities from ${label}.`);

    const sample = JSON.stringify(res.items.slice(0, 10));
    const rawObsId = await storeRawObservation(client, {
      sourceId: source.id,
      sourcePlatform: source.platform,
      fetchUrl: source.url,
      httpStatus: 200,
      rawPayload: sample,
      contentHash: res.bodyHash || undefined,
    });
    stats.totalRawCount++;

    for (const item of res.items) {
      const draft = toDraft(item, source);
      if (!draft) continue;
      await processAndRefineCandidate(client, rawObsId, draft, stats);
    }

    await markRawProcessed(client, rawObsId);
  } catch (err: any) {
    console.error(`${label} ingestion error:`, err.message);
  }
}

export async function runIngestionPipeline() {
  console.log("=== Starting Federated Opportunity Lake Ingestion & Refinery Run ===");
  const client = getLakeClient();

  const stats = {
    totalRawCount: 0,
    totalExtracted: 0,
    duplicates: 0,
    excluded: 0,
    qualifiedReady: 0,
    ambiguous: 0,
  };

  // 1. Himalayas Remote Jobs API (Reservoir)
  console.log("\n[Source 1/7] Ingesting Himalayas Remote Jobs API...");
  try {
    const url = "https://himalayas.app/jobs/api?limit=100";
    const res = await fetch(url, {
      headers: collectionHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(20_000),
    });
    const status = res.status;
    const rawText = await res.text();

    if (status === 200 && rawText) {
      const rawObsId = await storeRawObservation(client, {
        sourceId: "himalayas:remote-jobs",
        sourcePlatform: "Himalayas",
        fetchUrl: url,
        httpStatus: status,
        rawPayload: rawText,
      });
      stats.totalRawCount++;

      const json = JSON.parse(rawText) as RawHimalayasResponse;
      const normalized = parseHimalayasResponse(json);
      console.log(`Parsed ${normalized.length} jobs from Himalayas.`);

      for (const item of normalized) {
        await processAndRefineCandidate(
          client,
          rawObsId,
          {
            sourceId: "himalayas:remote-jobs",
            sourcePlatform: "Himalayas",
            sourceUrl: item.guid || item.applicationLink,
            title: item.title,
            company: item.companyName,
            category: item.categories[0] || "other",
            locationRaw: item.locationRestrictions.join(", ") || (item.isWorldwide ? "Worldwide" : "Remote"),
            description: item.excerpt || "",
            applicationUrl: item.applicationLink,
            postedAt: item.postedAt,
            tags: item.categories,
          },
          stats
        );
      }

      await markRawProcessed(client, rawObsId);
    }
  } catch (err: any) {
    console.error("Himalayas ingestion error:", err.message);
  }

  // 2. We Work Remotely RSS Feed
  console.log("\n[Source 2/7] Ingesting We Work Remotely RSS Feed...");
  const wwrSource: Source = {
    id: "we-work-remotely",
    name: "We Work Remotely",
    url: "https://weworkremotely.com/remote-jobs.rss",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "allowed",
    complianceNotes: "Public RSS feed",
    platform: "WeWorkRemotely",
    defaultJobType: "full-time",
    tags: ["remote"],
    maxItems: 100,
  };

  await ingestRssSource(client, wwrSource, stats, (item, source) => ({
    sourceId: source.id,
    sourcePlatform: source.platform,
    sourceUrl: item.sourceUrl,
    title: item.title,
    company: item.company || "Unknown",
    category: item.category || "other",
    locationRaw: item.locationRaw || "Remote",
    description: item.description || "",
    applicationUrl: item.sourceUrl,
    postedAt: item.postedAt || null,
    tags: ["remote"],
  }));

  // 3. Remotive RSS Feed
  console.log("\n[Source 3/7] Ingesting Remotive RSS Feed...");
  const remotiveSource: Source = {
    id: "remotive",
    name: "Remotive",
    url: "https://remotive.com/remote-jobs/feed",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "allowed",
    complianceNotes: "Public RSS feed",
    platform: "Remotive",
    defaultJobType: "full-time",
    tags: ["remote"],
    maxItems: 100,
  };

  await ingestRssSource(client, remotiveSource, stats, (item, source) => ({
    sourceId: source.id,
    sourcePlatform: source.platform,
    sourceUrl: item.sourceUrl,
    title: item.title,
    company: item.company || "Unknown",
    category: item.category || "other",
    locationRaw: item.locationRaw || "Remote",
    description: item.description || "",
    applicationUrl: item.sourceUrl,
    postedAt: item.postedAt || null,
    tags: ["remote"],
  }));

  // 4. Remote OK Public API
  console.log("\n[Source 4/7] Ingesting Remote OK Public API...");
  try {
    const remoteOkUrl = "https://remoteok.com/api";
    const res = await fetch(remoteOkUrl, {
      headers: collectionHeaders({ Accept: "application/json" }),
      signal: AbortSignal.timeout(20_000),
    });
    const status = res.status;
    const rawText = await res.text();

    if (status === 200 && rawText) {
      const rawObsId = await storeRawObservation(client, {
        sourceId: "remote-ok",
        sourcePlatform: "RemoteOK",
        fetchUrl: remoteOkUrl,
        httpStatus: status,
        rawPayload: rawText,
      });
      stats.totalRawCount++;

      const data = JSON.parse(rawText) as any[];
      // Index 0 is API terms of service notice
      const jobs = Array.isArray(data) ? data.slice(1) : [];
      console.log(`Parsed ${jobs.length} opportunities from Remote OK.`);

      for (const item of jobs) {
        if (!item || !item.position || !item.url) continue;

        await processAndRefineCandidate(
          client,
          rawObsId,
          {
            sourceId: "remote-ok",
            sourcePlatform: "RemoteOK",
            sourceUrl: item.url,
            title: item.position,
            company: item.company || "Unknown",
            category: Array.isArray(item.tags) ? item.tags[0] || "other" : "other",
            locationRaw: item.location || "Remote",
            description: item.description || "",
            applicationUrl: item.apply_url || item.url,
            postedAt: item.date ? new Date(item.date).toISOString() : null,
            tags: Array.isArray(item.tags) ? item.tags : [],
          },
          stats
        );
      }

      await markRawProcessed(client, rawObsId);
    }
  } catch (err: any) {
    console.error("Remote OK ingestion error:", err.message);
  }

  // 5. Real Work From Anywhere RSS
  console.log("\n[Source 5/7] Ingesting Real Work From Anywhere RSS...");
  const rwfaSource: Source = {
    id: "real-work-from-anywhere",
    name: "Real Work From Anywhere",
    url: "https://www.realworkfromanywhere.com/rss.xml",
    type: "rss",
    collectionMethod: "rss_feed",
    complianceStatus: "allowed",
    complianceNotes: "Official RSS feed",
    platform: "RealWorkFromAnywhere",
    defaultJobType: "full-time",
    tags: ["remote"],
    maxItems: 50,
  };

  await ingestRssSource(client, rwfaSource, stats, (item, source) => ({
    sourceId: source.id,
    sourcePlatform: source.platform,
    sourceUrl: item.sourceUrl,
    title: item.title,
    company: item.company || "Unknown",
    category: item.category || "other",
    locationRaw: item.locationRaw || "Remote",
    description: item.description || "",
    applicationUrl: item.sourceUrl,
    postedAt: item.postedAt || null,
    tags: ["remote"],
  }));

  // 6. Jobicy APAC Support Feeds
  console.log("\n[Source 6/7] Ingesting Jobicy APAC Feeds...");
  const jobicyFeeds: Source[] = [
    {
      id: "jobicy-admin-support-apac",
      name: "Jobicy Admin Support APAC",
      url: "https://jobicy.com/feed/job_feed?job_categories=admin-support&job_types=full-time&search_region=apac",
      type: "rss",
      collectionMethod: "rss_feed",
      complianceStatus: "allowed",
      complianceNotes: "Documented RSS feed",
      platform: "Jobicy",
      defaultJobType: "full-time",
      tags: ["admin", "apac"],
      maxItems: 40,
    },
    {
      id: "jobicy-supporting-apac",
      name: "Jobicy Customer Support APAC",
      url: "https://jobicy.com/feed/job_feed?job_categories=supporting&job_types=full-time&search_region=apac",
      type: "rss",
      collectionMethod: "rss_feed",
      complianceStatus: "allowed",
      complianceNotes: "Documented RSS feed",
      platform: "Jobicy",
      defaultJobType: "full-time",
      tags: ["customer-service", "apac"],
      maxItems: 40,
    },
  ];

  for (const feed of jobicyFeeds) {
    await ingestRssSource(
      client,
      feed,
      stats,
      (item, source) => ({
        sourceId: source.id,
        sourcePlatform: source.platform,
        sourceUrl: item.sourceUrl,
        title: item.title,
        company: item.company || "Unknown",
        category: source.tags?.[0] || "other",
        locationRaw: item.locationRaw || "APAC",
        description: item.description || "",
        applicationUrl: item.sourceUrl,
        postedAt: item.postedAt || null,
        tags: source.tags,
      }),
      `Jobicy feed ${feed.id}`
    );
  }

  // 7. Active Breezy VA Agencies
  console.log("\n[Source 7/7] Ingesting Active Breezy Agency Feeds...");
  const agencyTenants = [
    { tenant: "20four7va", name: "20Four7VA", id: "breezy:20four7va" },
    { tenant: "sourcefit", name: "Sourcefit", id: "breezy:sourcefit" },
    { tenant: "yokly", name: "Yokly", id: "breezy:yokly" },
    { tenant: "remote-craft", name: "Remote Craft", id: "breezy:remote-craft" },
    { tenant: "value-virtual-assistants", name: "VALUE Virtual Assistants", id: "breezy:value-virtual-assistants" },
  ];

  for (const agency of agencyTenants) {
    try {
      const agencyUrl = `https://${agency.tenant}.breezy.hr/json`;
      const res = await fetch(agencyUrl, {
        headers: collectionHeaders(),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        console.warn(`Agency ${agency.name} returned status ${res.status}`);
        continue;
      }

      const rawText = await res.text();
      const rawObsId = await storeRawObservation(client, {
        sourceId: agency.id,
        sourcePlatform: agency.name,
        fetchUrl: agencyUrl,
        httpStatus: res.status,
        rawPayload: rawText,
      });
      stats.totalRawCount++;

      const jobs = JSON.parse(rawText) as any[];
      console.log(`Parsed ${jobs.length} opportunities from ${agency.name}.`);

      for (const item of jobs) {
        if (!item || !item.name || !item.url) continue;

        const locName = item.location?.name || item.location?.country?.name || (item.location?.is_remote ? "Remote" : "Philippines");
        const postedAtDate = item.updated_at || item.created_at ? new Date(item.updated_at || item.created_at).toISOString() : null;

        await processAndRefineCandidate(
          client,
          rawObsId,
          {
            sourceId: agency.id,
            sourcePlatform: agency.name,
            sourceUrl: item.url,
            title: item.name,
            company: agency.name,
            category: "admin",
            locationRaw: locName,
            description: item.description || "",
            applicationUrl: item.url,
            postedAt: postedAtDate,
            tags: ["VA", "philippines"],
          },
          stats
        );
      }

      await markRawProcessed(client, rawObsId);
    } catch (err: any) {
      console.error(`Agency ${agency.name} error:`, err.message);
    }
  }

  console.log("\n=======================================================");
  console.log("             DATA LAKE REFINERY SUMMARY               ");
  console.log("=======================================================");
  console.log(`Raw Observations Stored:       ${stats.totalRawCount}`);
  console.log(`Total Candidates Extracted:    ${stats.totalExtracted}`);
  console.log(`Duplicates / Sightings:        ${stats.duplicates}`);
  console.log(`Excluded (Non-PH / Locked):    ${stats.excluded}`);
  console.log(`Ambiguous (Unclear Review):    ${stats.ambiguous}`);
  console.log(`QUALIFIED READY (For D1):      ${stats.qualifiedReady}`);
  console.log("=======================================================\n");

  return stats;
}

if (import.meta.main) {
  runIngestionPipeline().catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  });
}
