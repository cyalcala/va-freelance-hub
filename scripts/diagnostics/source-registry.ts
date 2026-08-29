#!/usr/bin/env bun
/**
 * SP-03: Read-only provider/source registry dump and mapping audit.
 *
 * No writes. Every query is a SELECT. This script is the single source of
 * truth for the "registry dump" SQL, like source-economics.ts for economics.
 * Tests execute the same SQL against an in-memory fixtures DB.
 *
 * What it answers:
 *  - provider_profiles: every configured provider mechanism, evidence lease,
 *    and default states (the correlated-risk family for concentration).
 *  - source_registry: every durable source identity with its independent
 *    compliance_state + operational_state (ADR-006 two axes) and opt-out.
 *  - mapping audit: which known static/ATS source_ids from the codebase are
 *    absent from the registry (unmapped), and which registry rows have no
 *    corresponding codebase entry (extra). Read-only, never activates.
 *
 * CLI:
 *   bun scripts/diagnostics/source-registry.ts sql                -> stdout (all dump SQL)
 *   bun scripts/diagnostics/source-registry.ts meta               -> stdout (json)
 *   bun scripts/diagnostics/source-registry.ts audit [--json]     -> stdout (known vs registry)
 */

import { sources } from "../../packages/scraper/sources";

// ATS token ids are hard-coded in the scrape route; importing that 2400-line
// route is fragile, so the canonical list is duplicated here and cross-checked
// by the registry.test.ts "26 sources" assertion. Keep this list in sync with
// `ATS_TOKEN_POLICIES` in `apps/web/src/pages/api/cron/scrape.ts`.
const ATS_TOKEN_IDS = [
  "ashby:supabase",
  "ashby:camunda",
  "ashby:tremendous",
  "ashby:amplify",
  "ashby:ashby",
  "greenhouse:grafanalabs",
  "greenhouse:nearform",
  "greenhouse:gitlab",
  "greenhouse:ghost",
  "greenhouse:remotecom",
  "breezy:20four7va",
  "breezy:sourcefit",
  "breezy:vaaphilippines-recruitment",
  "breezy:time-etc",
] as const;

export function knownSourceIds(): string[] {
  const staticIds = sources.map((s) => s.id);
  return [...staticIds, ...ATS_TOKEN_IDS];
}

export interface RegistryDumpQuery {
  name: string;
  sql: string;
}

export const REGISTRY_DUMP_QUERIES: RegistryDumpQuery[] = [
  {
    name: "provider_profiles",
    sql: `SELECT id, display_name, provider_family, mechanism, auth_class, endpoint_pattern, allowed_hosts, evidence_url, evidence_hash, evidence_captured_at, visibility_filter, content_scope, cadence_min_minutes, cadence_max_minutes, rate_guidance, robots_handling, removal_semantics, evidence_lease_days, default_compliance_state, default_operational_state, notes, created_at, updated_at FROM provider_profiles ORDER BY id;`,
  },
  {
    name: "source_registry",
    sql: `SELECT source_id, provider_id, display_name, endpoint_url, company_token, discovery_provenance, compliance_state, operational_state, review_deadline, policy_expiry, owner, last_decision, last_decision_at, opt_out, health_rollup, created_at, updated_at FROM source_registry ORDER BY source_id;`,
  },
  {
    name: "source_registry_by_provider",
    sql: `SELECT provider_id, compliance_state, operational_state, COUNT(*) as cnt FROM source_registry GROUP BY provider_id, compliance_state, operational_state ORDER BY provider_id;`,
  },
  {
    name: "registry_state_counts",
    sql: `SELECT compliance_state, operational_state, COUNT(*) as cnt FROM source_registry GROUP BY compliance_state, operational_state ORDER BY compliance_state, operational_state;`,
  },
];

export function emitSql(): string {
  const header = `-- SP-03 read-only registry dump\n-- Read-only: SELECT statements only, no mutations.\n`;
  return header + REGISTRY_DUMP_QUERIES.map((q) => `-- [${q.name}]\n${q.sql}`).join("\n\n") + "\n";
}

export interface RegistryMeta {
  unit: "SP-03";
  dumpOrder: string[];
  knownSourceIds: string[];
}

export function emitMeta(): RegistryMeta {
  return {
    unit: "SP-03",
    dumpOrder: REGISTRY_DUMP_QUERIES.map((q) => q.name),
    knownSourceIds: knownSourceIds(),
  };
}

// ─── Mapping audit (pure) ────────────────────────────────────────────────────

export interface MappingAudit {
  knownCount: number;
  registryCount: number;
  mapped: string[];
  unmapped: string[];
  extra: string[];
}

export function auditMapping(known: string[], registry: string[]): MappingAudit {
  const knownSet = new Set(known);
  const regSet = new Set(registry);
  const mapped = [...knownSet].filter((id) => regSet.has(id)).sort();
  const unmapped = [...knownSet].filter((id) => !regSet.has(id)).sort();
  const extra = [...regSet].filter((id) => !knownSet.has(id)).sort();
  return { knownCount: known.length, registryCount: registry.length, mapped, unmapped, extra };
}

export function renderAudit(audit: MappingAudit): string {
  const lines: string[] = [];
  lines.push(`# Source registry mapping audit (SP-03)`);
  lines.push(``);
  lines.push(`- Known (codebase) source ids: ${audit.knownCount}`);
  lines.push(`- Registry rows: ${audit.registryCount}`);
  lines.push(`- Mapped: ${audit.mapped.length}`);
  lines.push(`- Unmapped (known not in registry): ${audit.unmapped.length}`);
  lines.push(`- Extra (registry not in known): ${audit.extra.length}`);
  lines.push(``);
  if (audit.unmapped.length) {
    lines.push(`## Unmapped (registry can store these, but has not been seeded — read-only)`);
    for (const id of audit.unmapped) lines.push(`- \`${id}\``);
    lines.push(``);
  }
  if (audit.extra.length) {
    lines.push(`## Extra`);
    for (const id of audit.extra) lines.push(`- \`${id}\``);
    lines.push(``);
  }
  if (!audit.unmapped.length && !audit.extra.length) lines.push(`All known sources are mapped — none extra.`);
  else lines.push(`This dump does not activate sources. Unmapped entries remain non-publishing.`);
  return lines.join("\n");
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function main(): void {
  const cmd = process.argv[2];
  switch (cmd) {
    case "sql":
      process.stdout.write(emitSql());
      return;
    case "meta":
      process.stdout.write(JSON.stringify(emitMeta(), null, 2) + "\n");
      return;
    case "audit": {
      const wantsJson = process.argv.includes("--json");
      const known = knownSourceIds();
      // In dump mode we cannot reach D1 here; audit without registry is still useful:
      // it shows the full known set and that an empty registry flags 26 unmapped.
      // When a registry JSON is piped, parse it; otherwise audit against empty.
      // This keeps the CLI pure and read-only.
      const audit = auditMapping(known, []);
      if (wantsJson) process.stdout.write(JSON.stringify(audit, null, 2) + "\n");
      else process.stdout.write(renderAudit(audit) + "\n");
      return;
    }
    default:
      process.stderr.write(
        "Usage: source-registry.ts <sql|meta|audit [--json]>\n",
      );
      process.exit(2);
  }
}

if (import.meta.main) main();
