import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const REQUIRED_EXCEPTION_FIELDS = [
  "source_id",
  "exception_reason",
  "missing_capability",
  "blast_radius",
  "tests_added",
  "fallback_path",
  "owner_or_ADR_reference",
] as const;

export type RequiredExceptionField = (typeof REQUIRED_EXCEPTION_FIELDS)[number];

export interface ExceptionParseResult {
  valid: boolean;
  fields: Record<string, string>;
  missingFields: RequiredExceptionField[];
}

export interface ExceptionDocInput {
  path: string;
  content: string;
}

export interface GuardrailResult {
  errors: string[];
  warnings: string[];
  acceptedExceptions?: string[];
}

export function parseExceptionDocument(text: string): ExceptionParseResult {
  const fields: Record<string, string> = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Matches: "- field_name: value" or "field_name: value" with optional quotes
    const match = trimmed.match(/^(?:-\s*)?([a-zA-Z0-9_]+)\s*:\s*(?:["'](.*)["']|(.*))$/);
    if (match) {
      const key = match[1];
      const val = (match[2] !== undefined ? match[2] : match[3] ?? "").trim();
      if (val.length > 0) {
        fields[key] = val;
      }
    }
  }

  const missingFields: RequiredExceptionField[] = [];
  for (const field of REQUIRED_EXCEPTION_FIELDS) {
    if (!fields[field] || fields[field].trim() === "") {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    fields,
    missingFields,
  };
}

export function isSourceExpansionDiff(diffText: string): { isSourceAddition: boolean; matches: string[] } {
  const addedLines = diffText
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1).trim());

  const matches: string[] = [];

  const sourceAdditionPatterns: Array<{ name: string; regex: RegExp }> = [
    { name: "feed URL literal", regex: /https?:\/\/[^\s"',]+\.(?:xml|rss|atom|json)/i },
    { name: "ROBOTS_ENFORCE_SOURCE_IDS addition", regex: /ROBOTS_ENFORCE_SOURCE_IDS|enforceSourceIds/ },
    { name: "static source registration", regex: /\b(?:rssSources|htmlSources|jsonSources|staticSources)\b/ },
    { name: "source identity wiring", regex: /\b(?:source_id|sourceId)\s*:\s*["'][a-zA-Z0-9_-]+["']/ },
    { name: "ATS agency token/endpoint wiring", regex: /\b(?:atsEndpointUrl|AtsPlatform|atsAgency)\b/ },
  ];

  for (const line of addedLines) {
    for (const pattern of sourceAdditionPatterns) {
      if (pattern.regex.test(line)) {
        if (!matches.includes(pattern.name)) {
          matches.push(pattern.name);
        }
      }
    }
  }

  return {
    isSourceAddition: matches.length > 0,
    matches,
  };
}

export function inspectOrchestratorGuard({
  modifiedFiles,
  diffText = "",
  exceptionDocs = [],
}: {
  modifiedFiles: string[];
  diffText?: string;
  exceptionDocs?: ExceptionDocInput[];
}): GuardrailResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const acceptedExceptions: string[] = [];

  const scrapePath = "apps/web/src/pages/api/cron/scrape.ts";
  const scrapeModified = modifiedFiles.some((f) => f.replace(/\\/g, "/").endsWith(scrapePath));

  if (!scrapeModified) {
    return { errors, warnings, acceptedExceptions };
  }

  // Scrape was modified. Inspect exception documents if present.
  let validExceptionFound = false;

  for (const doc of exceptionDocs) {
    const parsed = parseExceptionDocument(doc.content);
    if (!parsed.valid) {
      errors.push(
        `${doc.path}: invalid C16 exception document. Missing required field(s): ${parsed.missingFields.join(", ")}`,
      );
    } else {
      validExceptionFound = true;
      acceptedExceptions.push(parsed.fields.source_id);
    }
  }

  if (validExceptionFound) {
    // Valid exception documented; permit modification
    return { errors, warnings, acceptedExceptions };
  }

  // Scrape modified without valid exception document
  const { isSourceAddition, matches } = isSourceExpansionDiff(diffText);

  if (isSourceAddition) {
    errors.push(
      `apps/web/src/pages/api/cron/scrape.ts: central orchestrator was modified with source additions (${matches.join(
        ", ",
      )}) without an approved exception document in docs/exceptions/<source_id>.md. Under Operating Constitution v5.2 §8.1 (C16), new sources must be added via conventional adapters or documented with an approved exception.`,
    );
  } else {
    warnings.push(
      `apps/web/src/pages/api/cron/scrape.ts: central orchestrator was modified without an exception document in docs/exceptions/. Ensure this is core maintenance/bugfix and not an ordinary source addition bypassing C16.`,
    );
  }

  return { errors, warnings, acceptedExceptions };
}

export async function getGitModifiedFiles(): Promise<string[]> {
  try {
    const baseRef = process.env.GITHUB_BASE_REF;
    const before = process.env.BEFORE;
    const current = process.env.CURRENT || "HEAD";

    let diffCmd: string[];
    if (baseRef) {
      diffCmd = ["git", "diff", "--name-only", `origin/${baseRef}...HEAD`];
    } else if (before && before !== "0000000000000000000000000000000000000000") {
      diffCmd = ["git", "diff", "--name-only", before, current];
    } else {
      // Default to HEAD~1 vs HEAD, or unstaged/staged vs HEAD if working tree dirty
      const statusProc = Bun.spawnSync(["git", "status", "--porcelain"]);
      const statusText = statusProc.stdout.toString().trim();
      if (statusText.length > 0) {
        diffCmd = ["git", "diff", "--name-only", "HEAD"];
      } else {
        diffCmd = ["git", "diff", "--name-only", "HEAD~1", "HEAD"];
      }
    }

    const proc = Bun.spawnSync(diffCmd);
    if (proc.exitCode === 0) {
      return proc.stdout
        .toString()
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {
    // If git fails, fall back to empty
  }
  return [];
}

export async function getGitScrapeDiff(): Promise<string> {
  try {
    const baseRef = process.env.GITHUB_BASE_REF;
    const before = process.env.BEFORE;
    const current = process.env.CURRENT || "HEAD";
    const targetFile = "apps/web/src/pages/api/cron/scrape.ts";

    let diffCmd: string[];
    if (baseRef) {
      diffCmd = ["git", "diff", `origin/${baseRef}...HEAD`, "--", targetFile];
    } else if (before && before !== "0000000000000000000000000000000000000000") {
      diffCmd = ["git", "diff", before, current, "--", targetFile];
    } else {
      const statusProc = Bun.spawnSync(["git", "status", "--porcelain"]);
      const statusText = statusProc.stdout.toString().trim();
      if (statusText.length > 0) {
        diffCmd = ["git", "diff", "HEAD", "--", targetFile];
      } else {
        diffCmd = ["git", "diff", "HEAD~1", "HEAD", "--", targetFile];
      }
    }

    const proc = Bun.spawnSync(diffCmd);
    if (proc.exitCode === 0) {
      return proc.stdout.toString();
    }
  } catch {
    // Return empty on failure
  }
  return "";
}

export async function auditOrchestratorModifications(
  rootDirectory = join(import.meta.dir, "../.."),
): Promise<GuardrailResult> {
  const exceptionsDir = join(rootDirectory, "docs/exceptions");
  const exceptionDocs: ExceptionDocInput[] = [];

  if (existsSync(exceptionsDir)) {
    const files = await readdir(exceptionsDir);
    for (const file of files) {
      if (file.endsWith(".md") && file.toLowerCase() !== "readme.md") {
        const filePath = join(exceptionsDir, file);
        const content = await Bun.file(filePath).text();
        exceptionDocs.push({
          path: `docs/exceptions/${file}`,
          content,
        });
      }
    }
  }

  const modifiedFiles = await getGitModifiedFiles();
  const diffText = await getGitScrapeDiff();

  return inspectOrchestratorGuard({
    modifiedFiles,
    diffText,
    exceptionDocs,
  });
}

if (import.meta.main) {
  const result = await auditOrchestratorModifications();
  for (const accepted of result.acceptedExceptions || []) {
    console.log(`[C16 EXCEPTION ACCEPTED] source_id: ${accepted}`);
  }
  for (const warning of result.warnings) {
    console.warn(`[WARN] ${warning}`);
  }
  for (const error of result.errors) {
    console.error(`[ERROR] ${error}`);
  }
  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}
