import type { APIRoute } from "astro";
import { getDb, opportunities, vaDirectory, type NewOpportunity } from "@va-hub/db";
import { isNotNull, and, inArray, eq } from "drizzle-orm";
import { normalizeUtcIso, nowUtcIso } from "@/lib/time";

export const prerender = false;
import { disabledSources, rssSources, htmlSources, fetchRSSFeed, fetchHTMLSource, fetchATSFeed, triageJob, type CollectionMethod, type ComplianceStatus, type Source } from "@va-hub/scraper";

async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function mapTriageCategoryToUiCategory(cat: string): string {
  switch (cat) {
    case "admin": return "admin";
    case "design":
    case "creative": return "design";
    case "tech": return "tech";
    case "marketing":
    case "social-media": return "marketing";
    case "customer-service":
    case "customer-support": return "customer-service";
    case "finance": return "finance";
    default: return "other";
  }
}

type SourceType = "RSS" | "HTML" | "ATS";

interface SourceFetchResult {
  sourceName: string;
  sourceType: SourceType;
  collectionMethod: CollectionMethod | "public_ats_json";
  complianceStatus: ComplianceStatus;
  complianceNotes?: string;
  ok: boolean;
  count: number;
  durationMs: number;
  items: NewOpportunity[];
  skipped?: boolean;
  skipReason?: string;
  error?: string;
}

interface InsertError {
  batchStart: number;
  batchSize: number;
  error: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sourceStatus(result: SourceFetchResult) {
  const { items: _items, ...status } = result;
  return status;
}

function toSourceType(source: Source): SourceType {
  return source.type === "rss" ? "RSS" : "HTML";
}

function skippedSourceResult(source: Source): SourceFetchResult {
  return {
    sourceName: source.name,
    sourceType: toSourceType(source),
    collectionMethod: source.collectionMethod,
    complianceStatus: source.complianceStatus,
    complianceNotes: source.complianceNotes,
    ok: true,
    count: 0,
    durationMs: 0,
    items: [],
    skipped: true,
    skipReason: source.complianceNotes,
  };
}

interface AtsAgency {
  id: number;
  companyName: string;
  atsPlatform: string | null;
  atsToken: string | null;
  verifiedAt: string | null;
}

type AtsPlatform = "lever" | "greenhouse" | "workable" | "breezy";

interface AtsPlatformPolicy {
  enabled: boolean;
  complianceStatus: ComplianceStatus;
  complianceNotes: string;
}

const ATS_PLATFORM_POLICIES: Record<AtsPlatform, AtsPlatformPolicy> = {
  breezy: {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Directory-configured Breezy public JSON endpoint; source terms are not individually reviewed yet, so route users to original ATS-hosted URLs.",
  },
  workable: {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Directory-configured Workable public API endpoint; fetched using a staggered rotating schedule (1-2 per cron run) to prevent HTTP 429 rate limiting.",
  },
  greenhouse: {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Directory-configured Greenhouse public board endpoint; source terms are not individually reviewed yet, so route users to original ATS-hosted URLs.",
  },
  lever: {
    enabled: true,
    complianceStatus: "needs_review",
    complianceNotes:
      "Directory-configured Lever public postings endpoint; source terms are not individually reviewed yet, so route users to original ATS-hosted URLs.",
  },
};

interface DuplicateAtsAgency {
  agency: AtsAgency;
  primaryCompanyName: string;
}

interface SkippedAtsAgency {
  agency: AtsAgency;
  policy: AtsPlatformPolicy;
  skipReason: string;
}

function atsSourceKey(agency: AtsAgency): string {
  return `${agency.atsPlatform}:${agency.atsToken}`;
}

function atsPlatformPolicy(agency: AtsAgency): AtsPlatformPolicy {
  const platform = agency.atsPlatform as AtsPlatform | null;
  if (platform && platform in ATS_PLATFORM_POLICIES) {
    return ATS_PLATFORM_POLICIES[platform];
  }

  return {
    enabled: false,
    complianceStatus: "paused",
    complianceNotes: `Paused 2026-06-09: unknown ATS platform "${agency.atsPlatform}" is not configured for safe collection.`,
  };
}

function atsComplianceNotes(agency: AtsAgency): string {
  return atsPlatformPolicy(agency).complianceNotes;
}

function skippedAtsResult({ agency, policy, skipReason }: SkippedAtsAgency): SourceFetchResult {
  return {
    sourceName: agency.companyName,
    sourceType: "ATS",
    collectionMethod: "public_ats_json",
    complianceStatus: policy.complianceStatus,
    complianceNotes: policy.complianceNotes,
    ok: true,
    count: 0,
    durationMs: 0,
    items: [],
    skipped: true,
    skipReason,
  };
}

function skippedDuplicateAtsResult({ agency, primaryCompanyName }: DuplicateAtsAgency): SourceFetchResult {
  return skippedAtsResult({
    agency,
    policy: atsPlatformPolicy(agency),
    skipReason: `Duplicate ATS token already fetched for ${primaryCompanyName}; skipped to avoid duplicate requests and duplicate source URLs.`,
  });
}

async function fetchSourceWithStatus(
  sourceName: string,
  sourceType: SourceType,
  collectionMethod: SourceFetchResult["collectionMethod"],
  complianceStatus: ComplianceStatus,
  complianceNotes: string | undefined,
  fetcher: () => Promise<NewOpportunity[]>
): Promise<SourceFetchResult> {
  const startedAt = Date.now();
  try {
    const items = await fetcher();
    return {
      sourceName,
      sourceType,
      collectionMethod,
      complianceStatus,
      complianceNotes,
      ok: true,
      count: items.length,
      durationMs: Date.now() - startedAt,
      items,
    };
  } catch (error) {
    return {
      sourceName,
      sourceType,
      collectionMethod,
      complianceStatus,
      complianceNotes,
      ok: false,
      count: 0,
      durationMs: Date.now() - startedAt,
      items: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  console.log("[api/cron/scrape] Starting execution...");
  
  const env = locals.runtime.env as any;
  const db = getDb(env);
  const observedAt = nowUtcIso();

  // 1. Rate Limiting Check
  const rateLimiter = env?.API_RATE_LIMITER;
  if (rateLimiter) {
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await rateLimiter.limit({ key: clientIp });
    if (!success) {
      console.warn(`[api/cron/scrape] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(JSON.stringify({ error: "Too Many Requests" }), { 
        status: 429, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }

  // 2. Authorization Check — supports both header formats and env var names for compatibility
  const proxySecret = env?.PROXY_SECRET || env?.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");
  const cronSecretHeader = request.headers.get("x-cron-secret");
  const providedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : cronSecretHeader;
  if (!proxySecret || !providedSecret || providedSecret !== proxySecret) {
    console.warn("[api/cron/scrape] Unauthorized access attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 3. Fetch all raw items
    const rssResults = await Promise.all(
      rssSources.map((source) =>
        fetchSourceWithStatus(source.name, "RSS", source.collectionMethod, source.complianceStatus, source.complianceNotes, () => fetchRSSFeed(source))
      )
    );
    const rssItems = rssResults.flatMap((result) => result.items);

    const htmlResults = await Promise.all(
      htmlSources.map((source) =>
        fetchSourceWithStatus(source.name, "HTML", source.collectionMethod, source.complianceStatus, source.complianceNotes, () => fetchHTMLSource(source))
      )
    );
    const htmlItems = htmlResults.flatMap((result) => result.items);

    const atsAgencies = await db.select().from(vaDirectory).where(
      and(
        isNotNull(vaDirectory.atsPlatform),
        isNotNull(vaDirectory.atsToken)
      )
    );
    
    console.log(`[api/cron/scrape] Found ${atsAgencies.length} ATS-enabled agencies in the directory.`);

        const sortedAtsAgencies = [...atsAgencies].sort((a, b) =>
      atsSourceKey(a).localeCompare(atsSourceKey(b)) ||
      a.companyName.localeCompare(b.companyName)
    );

    // Staggered Workable Polling: Select only the 2 oldest/unscraped Workable agencies
    const workableAgencies = sortedAtsAgencies.filter(a => a.atsPlatform === "workable");
    workableAgencies.sort((a, b) => {
      if (!a.verifiedAt && b.verifiedAt) return -1;
      if (a.verifiedAt && !b.verifiedAt) return 1;
      if (!a.verifiedAt && !b.verifiedAt) return 0;
      return a.verifiedAt!.localeCompare(b.verifiedAt!);
    });
    const allowedWorkableTokens = new Set(workableAgencies.slice(0, 2).map(a => a.atsToken));

    const primaryAtsCompanies = new Map<string, string>();
    const uniqueAtsAgencies: AtsAgency[] = [];
    const duplicateAtsAgencies: DuplicateAtsAgency[] = [];
    const policySkippedAtsAgencies: SkippedAtsAgency[] = [];

    for (const agency of sortedAtsAgencies) {
      const policy = atsPlatformPolicy(agency);
      if (!policy.enabled) {
        policySkippedAtsAgencies.push({
          agency,
          policy,
          skipReason: policy.complianceNotes,
        });
        continue;
      }

      // Skip Workable agencies not in the current active rotation slice
      if (agency.atsPlatform === "workable" && !allowedWorkableTokens.has(agency.atsToken)) {
        policySkippedAtsAgencies.push({
          agency,
          policy,
          skipReason: "Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs)."
        });
        continue;
      }

      const sourceKey = atsSourceKey(agency);
      const primaryCompanyName = primaryAtsCompanies.get(sourceKey);
      if (primaryCompanyName) {
        duplicateAtsAgencies.push({ agency, primaryCompanyName });
      } else {
        primaryAtsCompanies.set(sourceKey, agency.companyName);
        uniqueAtsAgencies.push(agency);
      }
    }

    if (duplicateAtsAgencies.length > 0) {
      console.warn(
        `[api/cron/scrape] Skipping ${duplicateAtsAgencies.length} duplicate ATS director${duplicateAtsAgencies.length === 1 ? "y" : "ies"}.`
      );
    }
    if (policySkippedAtsAgencies.length > 0) {
      console.warn(
        `[api/cron/scrape] Skipping ${policySkippedAtsAgencies.length} ATS director${policySkippedAtsAgencies.length === 1 ? "y" : "ies"} due to platform policy or rotation.`
      );
    }
    
    const atsResults: SourceFetchResult[] = [];
    for (const agency of uniqueAtsAgencies) {
      const policy = atsPlatformPolicy(agency);
      const result = await fetchSourceWithStatus(agency.companyName, "ATS", "public_ats_json", policy.complianceStatus, policy.complianceNotes, () =>
        fetchATSFeed(agency.atsPlatform as any, agency.atsToken as string, agency.companyName)
      );
      atsResults.push(result);

      if (result.ok && agency.atsPlatform === "workable") {
        try {
          await db.update(vaDirectory)
            .set({ verifiedAt: observedAt })
            .where(eq(vaDirectory.id, agency.id));
          console.log(`[api/cron/scrape] Updated verifiedAt to ${observedAt} for Workable agency: ${agency.companyName}`);
        } catch (error) {
          console.error(`[api/cron/scrape] Failed to update verifiedAt for Workable agency: ${agency.companyName}`, error);
        }
      }

      if (agency.atsPlatform === "workable") {
        await sleep(1_000);
      }
    }
    const atsItems = atsResults.flatMap((result) => result.items);

    const skippedResults = disabledSources.map(skippedSourceResult);
    const skippedAtsResults = [
      ...policySkippedAtsAgencies.map(skippedAtsResult),
      ...duplicateAtsAgencies.map(skippedDuplicateAtsResult),
    ];
    const sourceResults = [...rssResults, ...htmlResults, ...skippedResults, ...atsResults, ...skippedAtsResults].map(sourceStatus);
    const failedSources = sourceResults
      .filter((result) => !result.ok)
      .map((result) => `${result.sourceName} (${result.sourceType}): ${result.error}`);

    const allItems = [...rssItems, ...htmlItems, ...atsItems];
    console.log(`[api/cron/scrape] Scraped ${allItems.length} raw items (${rssItems.length} RSS, ${htmlItems.length} HTML, ${atsItems.length} ATS)`);

    if (allItems.length === 0) {
      return new Response(JSON.stringify({ 
        inserted: 0, 
        actualChanges: 0,
        acceptedForInsert: 0,
        attemptedInsert: 0,
        insertFailedBatches: 0,
        insertErrors: [],
        skipped: 0, 
        failedSources, 
        sourceResults,
        message: "No jobs scraped" 
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 4. De-duplicate against existing database entries by source URL (batch check, not full-table scan)
    const allScrapedUrls = allItems.map(item => item.sourceUrl).filter(Boolean);
    const BATCH_SIZE = 50;
    const existingUrls = new Set<string>();
    for (let i = 0; i < allScrapedUrls.length; i += BATCH_SIZE) {
      const batch = allScrapedUrls.slice(i, i + BATCH_SIZE);
      const found = await db.select({ sourceUrl: opportunities.sourceUrl })
        .from(opportunities)
        .where(inArray(opportunities.sourceUrl, batch));
      found.forEach((r: any) => existingUrls.add(r.sourceUrl));
    }

    // Update lastSeenInFeedAt for jobs still in feeds (prevents false stale archiving)
    if (existingUrls.size > 0) {
      const existingUrlArray = Array.from(existingUrls);
      for (let i = 0; i < existingUrlArray.length; i += BATCH_SIZE) {
        const batch = existingUrlArray.slice(i, i + BATCH_SIZE);
        await db.update(opportunities)
          .set({ lastSeenInFeedAt: observedAt, updatedAt: observedAt })
          .where(inArray(opportunities.sourceUrl, batch));
      }
      console.log(`[api/cron/scrape] Updated lastSeenInFeedAt for ${existingUrls.size} existing jobs`);
    }

    const newItems = allItems.filter((item) => item.sourceUrl && !existingUrls.has(item.sourceUrl));
    console.log(`[api/cron/scrape] ${newItems.length} new items found after URL dedup`);

    if (newItems.length === 0) {
      return new Response(JSON.stringify({ 
        inserted: 0, 
        actualChanges: 0,
        acceptedForInsert: 0,
        attemptedInsert: 0,
        insertFailedBatches: 0,
        insertErrors: [],
        skipped: allItems.length, 
        failedSources, 
        sourceResults,
        message: "Zero new jobs after dedup" 
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 5. Triage and classify new items
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "25", 10);
    const itemsToProcess = newItems.slice(0, limit);
    console.log(`[api/cron/scrape] Processing ${itemsToProcess.length} out of ${newItems.length} new items (limit: ${limit})`);

    const triagedItems: typeof opportunities.$inferInsert[] = [];
    const concurrency = 3;

    for (let i = 0; i < itemsToProcess.length; i += concurrency) {
      const chunk = itemsToProcess.slice(i, i + concurrency);
      const results = await Promise.all(
        chunk.map(async (item) => {
          console.log(`[api/cron/scrape] Triaging: "${item.title}"`);
          try {
            const triage = await triageJob(item.title, item.description || "", env);
            return { item, triage };
          } catch (err) {
            console.error(`[api/cron/scrape] Triage failed for "${item.title}":`, err);
            return { item, triage: null };
          }
        })
      );

      for (const { item, triage } of results) {
        if (!triage) continue;

        if (!triage.eligibleForFilipinos) {
          console.log(`[api/cron/scrape] Filtering out ineligible job: "${item.title}". Reason: ${triage.reason}`);
          continue;
        }

        // Merge tags: combine scraper sources tags, LLM category, and LLM skills/tags
        const mergedTags = Array.from(
          new Set([
            ...(item.tags || []),
            triage.category,
            ...(triage.tags || []),
          ])
        )
          .filter(Boolean)
          .map((t) => typeof t === 'string' ? t.toLowerCase().trim() : t);

        const cleanDesc = (item.description || "").slice(0, 1500);
        const descriptionHash = await generateHash(item.title + cleanDesc);

        triagedItems.push({
          ...item,
          applicationUrl: triage.applicationUrl || item.applicationUrl || item.sourceUrl,
          tags: mergedTags,
          payRange: triage.payRange,
          category: mapTriageCategoryToUiCategory(triage.category),
          experienceLevel: triage.experienceLevel,
          type: triage.employmentType === "contract" ? "freelance" : (triage.employmentType || "freelance"),
          descriptionHash,
          postedAt: normalizeUtcIso(item.postedAt),
          scrapedAt: observedAt,
          lastSeenInFeedAt: observedAt,
          updatedAt: observedAt,
        });
      }
    }

    console.log(`[api/cron/scrape] ${triagedItems.length} jobs approved after AI triaging`);

    if (triagedItems.length === 0) {
      return new Response(JSON.stringify({
        inserted: 0,
        actualChanges: 0,
        acceptedForInsert: 0,
        attemptedInsert: 0,
        insertFailedBatches: 0,
        insertErrors: [],
        processed: itemsToProcess.length,
        backlogRemaining: newItems.length - itemsToProcess.length,
        skipped: allItems.length,
        failedSources,
        sourceResults,
        message: "No jobs passed AI triage in this batch"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 6. Batch insert into D1
    let actualChanges = 0;
    let attemptedInsert = 0;
    let insertFailedBatches = 0;
    const insertErrors: InsertError[] = [];
    for (let i = 0; i < triagedItems.length; i += 5) {
      const batch = triagedItems.slice(i, i + 5);
      attemptedInsert += batch.length;
      try {
        console.log(`[api/cron/scrape] Inserting batch of ${batch.length} items:`, batch.map(b => `${b.title} (${b.sourceUrl})`));
        const res = await db.insert(opportunities).values(batch).onConflictDoNothing();
        console.log(`[api/cron/scrape] D1 insert result:`, JSON.stringify(res));
        if (res && (res as any).meta && typeof (res as any).meta.changes === "number") {
          actualChanges += (res as any).meta.changes;
        } else {
          insertErrors.push({
            batchStart: i,
            batchSize: batch.length,
            error: "D1 insert metadata did not include meta.changes",
          });
        }
      } catch (err) {
        insertFailedBatches += 1;
        insertErrors.push({
          batchStart: i,
          batchSize: batch.length,
          error: errorMessage(err),
        });
        console.error(`[api/cron/scrape] Batch insert failed (index ${i}):`, err);
      }
    }

    console.log(`[api/cron/scrape] Finished. Processed ${itemsToProcess.length}, accepted ${triagedItems.length}, attempted ${attemptedInsert}, actual DB changes: ${actualChanges}, failed batches: ${insertFailedBatches}`);
    return new Response(JSON.stringify({
      inserted: actualChanges,
      actualChanges,
      acceptedForInsert: triagedItems.length,
      attemptedInsert,
      insertFailedBatches,
      insertErrors,
      filteredOut: itemsToProcess.length - triagedItems.length,
      processed: itemsToProcess.length,
      backlogRemaining: newItems.length - itemsToProcess.length,
      skipped: allItems.length - actualChanges,
      failedSources,
      sourceResults,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[api/cron/scrape] Error during scraping task:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
