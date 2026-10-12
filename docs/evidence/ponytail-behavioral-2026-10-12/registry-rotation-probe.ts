import { readFileSync } from "node:fs";
import { mergeRegistryAtsSources } from "../../../apps/web/src/pages/api/cron/scrape";
globalThis.fetch = (async () => { throw new Error("synthetic rotation probe forbids network"); }) as typeof fetch;
const archived = JSON.parse(readFileSync(new URL("./registry-selector-before-repair.json", import.meta.url), "utf8"));
// Replay the captured selector; current production repair may have replaced it.
const select = new Function("atsAgencies", "atsSourceKey", archived.code.replaceAll("verifiedAt!", "verifiedAt") + "\nreturn [...allowedWorkableTokens];");
const registry = new Map(["aa", "bb", "cc"].map(token => ["workable:"+token, { operationalState: "canary", displayName: token }]));
const agencies = mergeRegistryAtsSources([], registry as any);
const states = new Map<string, { lastAttemptAt: string }>();
const ticks = [];
for (let n = 0; n < 5; n++) {
  const now = new Date(Date.parse("2026-10-12T00:00:00Z") + n * 61 * 60000).toISOString();
  const chosen = select(agencies, (a: any) => a.atsPlatform+":"+a.atsToken) as string[];
  for (const a of agencies.filter((a: any) => chosen.includes(a.atsToken))) {
    states.set("workable:"+(a as any).atsToken, { lastAttemptAt: now });
    if ((a as any).id > 0) (a as any).verifiedAt = now;
  }
  ticks.push({ now, chosen });
}
if (!ticks.every(t => t.chosen.join(",") === "aa,bb") || states.has("workable:cc")) throw new Error("archived rotation counterexample changed");
console.log("REGISTRY_ROTATION_COUNTEREXAMPLE " + JSON.stringify({ scope: "ACTUAL_REGISTRY_MERGE_AND_ARCHIVED_PRE_REPAIR_SELECTOR_SYNTHETIC_DISPATCH_NOT_CURRENT_SELECTOR_ACCEPTANCE", gitRevision: archived.gitRevision, agencies, ticks, states: [...states] }));
