// Auto-pause support for the Sentinel maintenance bot (Tier 3, 2026-07-07).
//
// The Sentinel workflow appends entries to paused-sources.json via PR when a
// source keeps failing. This module validates that file defensively (a bad
// entry must never break scraping — worst case it is ignored) and applies
// pauses to the source list as pure, unit-tested functions. Pauses take
// effect on deploy, which the auto-merge itself triggers via CI.

import type { Source } from "./sources";
import rawConfig from "./paused-sources.json";

export interface AutoPauseEntry {
  sourceId: string;
  reason: string;
  pausedAt: string;
  by: string;
}

/** Defensively parse the JSON config; malformed entries are dropped, never thrown. */
export function validateAutoPauses(raw: unknown): AutoPauseEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as any).paused;
  if (!Array.isArray(list)) return [];
  const valid: AutoPauseEntry[] = [];
  for (const item of list) {
    if (
      item && typeof item === "object" &&
      typeof item.sourceId === "string" && item.sourceId.trim() !== "" &&
      typeof item.reason === "string" &&
      typeof item.pausedAt === "string" &&
      typeof item.by === "string"
    ) {
      valid.push({
        sourceId: item.sourceId.trim(),
        reason: item.reason,
        pausedAt: item.pausedAt,
        by: item.by,
      });
    }
  }
  return valid;
}

export const autoPauseEntries: AutoPauseEntry[] = validateAutoPauses(rawConfig);

const pauseIndex = new Map(autoPauseEntries.map((e) => [e.sourceId, e]));

export function isAutoPaused(sourceId: string): boolean {
  return pauseIndex.has(sourceId);
}

export function autoPauseNote(sourceId: string): string | null {
  const entry = pauseIndex.get(sourceId);
  if (!entry) return null;
  return `Auto-paused ${entry.pausedAt} by ${entry.by}: ${entry.reason}`;
}

/**
 * Return a copy of the source list with auto-paused sources marked
 * complianceStatus "paused" and their notes prefixed with the pause reason,
 * so existing skip-reporting surfaces the pause without any caller changes.
 */
export function applyAutoPauses(list: Source[], pauses: AutoPauseEntry[]): Source[] {
  if (pauses.length === 0) return list;
  const index = new Map(pauses.map((e) => [e.sourceId, e]));
  return list.map((source) => {
    const entry = index.get(source.id);
    if (!entry) return source;
    return {
      ...source,
      complianceStatus: "paused" as const,
      complianceNotes: `Auto-paused ${entry.pausedAt} by ${entry.by}: ${entry.reason} (Prior notes: ${source.complianceNotes})`,
    };
  });
}
