#!/usr/bin/env bun
/**
 * ==============================================================================
 * VA Freelance Hub — Unit GCP-02: Cloud Run Job Lake Publication Runner
 * Authority: docs/plans/UNIT_GCP_02_LAKE_PUBLISH_MIGRATION.md
 * Master Operating Constitution v3.0 (Part LXII)
 * ==============================================================================
 */

import { syncQualifiedJobsToD1 } from "../lake/sync-to-d1";
import { enrollPublishedSources } from "../lake/enroll-published-sources";
import { getLakeClient } from "../lake/client";

export interface LakePublishLogPayload {
  severity: "INFO" | "WARNING" | "ERROR";
  component: "lake-publish";
  unit: "GCP-02";
  event: string;
  syncedCount?: number;
  enrolledSources?: number;
  durationMs?: number;
  error?: string;
  timestamp: string;
}

export function formatGcpLog(payload: LakePublishLogPayload): string {
  return JSON.stringify(payload);
}

export async function runLakePublish(
  env = process.env,
  deps: {
    syncFn?: typeof syncQualifiedJobsToD1;
    enrollFn?: typeof enrollPublishedSources;
  } = {},
): Promise<{ ok: boolean; syncedCount: number; message: string }> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const tursoUrl = env.TURSO_DATABASE_URL || "";
  const tursoToken = env.TURSO_AUTH_TOKEN || "";
  const cfToken = env.CLOUDFLARE_API_TOKEN || "";
  const cfAccount = env.CLOUDFLARE_ACCOUNT_ID || "";
  const proxySecret = env.PROXY_SECRET || env.CRON_SECRET || "";

  // 1. Missing credentials check (fail-safe skip, matches gha-lake-publish.yml contract)
  if (!tursoUrl || !cfToken) {
    const msg = "Skipped: TURSO_DATABASE_URL or CLOUDFLARE_API_TOKEN is not configured.";
    console.warn(
      formatGcpLog({
        severity: "WARNING",
        component: "lake-publish",
        unit: "GCP-02",
        event: "lake_publish_skipped_missing_credentials",
        error: msg,
        timestamp,
      }),
    );
    return { ok: true, syncedCount: 0, message: msg };
  }

  try {
    console.log(`[lake-publish] Starting synchronization from Turso Lake to Cloudflare D1...`);

    // 2. Synchronize qualified opportunities into D1
    const sync = deps.syncFn ?? syncQualifiedJobsToD1;
    const syncResult = await sync(200, false, {
      holdAutoApproved: false,
    });

    console.log(`[lake-publish] Synced ${syncResult.syncedCount} opportunities to D1.`);

    // 3. Enroll auto-approved sources onto shadow/canary clock
    let enrolledCount = 0;
    if (proxySecret) {
      try {
        const client = getLakeClient();
        const res = await client.execute(`
          SELECT source_id FROM lake_ats_discovery
          WHERE review_status = 'auto_approved' AND source_id <> ''
          ORDER BY source_id;
        `);
        const sourceIds = res.rows.map((row) => String(row.source_id ?? "")).filter((id) => id.length > 0);

        if (sourceIds.length > 0) {
          const admitUrl = env.SOURCE_ADMIT_URL ?? "https://remotejobs-ph.pages.dev/api/cron/source-admit";
          const promoteUrl = env.SOURCE_PROMOTE_URL ?? "https://remotejobs-ph.pages.dev/api/cron/source-promote";
          const enrollResults = await enrollPublishedSources({
            admitUrl,
            promoteUrl,
            secret: proxySecret,
            sourceIds,
          });
          enrolledCount = enrollResults.filter((r) => r.disposition === "enrolled").length;
          console.log(`[lake-publish] Enrolled ${enrolledCount}/${sourceIds.length} auto-approved sources.`);
        }
      } catch (enrollErr: any) {
        console.warn(`[lake-publish] Warning during source enrollment: ${enrollErr.message}`);
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      formatGcpLog({
        severity: "INFO",
        component: "lake-publish",
        unit: "GCP-02",
        event: "lake_publish_completed",
        syncedCount: syncResult.syncedCount,
        enrolledSources: enrolledCount,
        durationMs,
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      ok: true,
      syncedCount: syncResult.syncedCount,
      message: `Successfully synced ${syncResult.syncedCount} opportunities in ${durationMs}ms`,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error(
      formatGcpLog({
        severity: "ERROR",
        component: "lake-publish",
        unit: "GCP-02",
        event: "lake_publish_failed",
        error: err.message,
        durationMs,
        timestamp: new Date().toISOString(),
      }),
    );
    return { ok: false, syncedCount: 0, message: err.message };
  }
}

if (import.meta.main) {
  const result = await runLakePublish();
  if (!result.ok) {
    process.exit(1);
  }
  process.exit(0);
}
