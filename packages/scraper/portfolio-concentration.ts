/**
 * Portfolio share math shared by the publication measurement and the
 * constitution metrics. Empty books stay UNKNOWN. A share above the ceiling
 * is a breach. This module does not block a writer.
 */

export const TOP_SOURCE_SHARE_MAX = 0.25;
export const TOP_PROVIDER_FAMILY_SHARE_MAX = 0.4;

export interface ShareRow {
  id: string;
  count: number;
}

export interface ConcentrationReport {
  total: number;
  topId: string | null;
  topShare: number | null;
  status: "UNKNOWN" | "OK" | "BREACH";
  breaches: Array<{ id: string; share: number }>;
}

export function providerFamily(sourceId: string): string {
  const trimmed = sourceId.trim();
  if (!trimmed) return "unknown";
  const separator = trimmed.indexOf(":");
  return separator <= 0 ? trimmed : trimmed.slice(0, separator);
}

export function familyShares(rows: Array<{ sourceId: string; count: number }>): ShareRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!(row.count > 0)) continue;
    const family = providerFamily(row.sourceId);
    totals.set(family, (totals.get(family) ?? 0) + row.count);
  }
  return [...totals.entries()].map(([id, count]) => ({ id, count }));
}

export function concentrationReport(rows: ShareRow[], ceiling: number): ConcentrationReport {
  if (!(ceiling > 0 && ceiling <= 1)) {
    throw new Error("concentration ceiling must be in (0, 1]");
  }
  const usable = rows.filter((row) => row.count > 0 && row.id.trim().length > 0);
  const total = usable.reduce((sum, row) => sum + row.count, 0);
  if (total <= 0) {
    return { total: 0, topId: null, topShare: null, status: "UNKNOWN", breaches: [] };
  }
  const ranked = [...usable].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const breaches = ranked
    .map((row) => ({ id: row.id, share: row.count / total }))
    .filter((row) => row.share > ceiling);
  const top = ranked[0];
  const topShare = top.count / total;
  return {
    total,
    topId: top.id,
    topShare,
    status: topShare > ceiling ? "BREACH" : "OK",
    breaches,
  };
}
