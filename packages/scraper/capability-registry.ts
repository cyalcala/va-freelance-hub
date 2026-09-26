/**
 * Capability Registry & Conventional Source Adapters (Phase 7 — C16 & C17)
 *
 * Implements Operating Constitution v5.2 §8.1 (C16 Convention-Driven Source Integration)
 * and §8.2 (C17 Capability-Based Dispatch).
 *
 * Decouples source definitions from central orchestration (scrape.ts). New conventional
 * sources route via registry-driven capability dispatch based on capability name, payload
 * representation, and processing guarantees before provider identity.
 */

import type { NewOpportunity } from "@va-hub/db";
import type { AtsPlatform } from "./ats";
import { fetchATSFeed } from "./ats";
import { fetchRSSFeed } from "./rss";
import { fetchHTMLSource } from "./html";
import { fetchJSONSource } from "./json";
import { fetchRecruiteeFeed } from "./recruitee";
import { fetchTeamtailorFeed } from "./teamtailor";
import type { Source } from "./sources";
import type { ConditionalState, SourceFetchOutput } from "./conditional";
import { toContentHash } from "./contentHash";

// ─── Standard Capabilities ───────────────────────────────────────────────────

export const STANDARD_CAPABILITIES = [
  "ats_json",
  "rss_xml",
  "structured_xml",
  "public_json_api",
  "static_html",
] as const;

export type StandardCapability = (typeof STANDARD_CAPABILITIES)[number];

export type PayloadKind = "json" | "xml" | "html";

/**
 * Routing metadata recorded for every dispatched event per Constitution §8.2.
 */
export interface RoutingMetadata {
  sourceId: string;
  declaredCapability: string;
  payloadKind: PayloadKind;
  selectedProcessor: string;
  warnings: string[];
  dispatchedAt: string;
  durationMs: number;
}

/**
 * Conventional source definition that can be added without modifying
 * the central orchestrator (apps/web/src/pages/api/cron/scrape.ts).
 */
export interface ConventionalSourceConfig {
  id: string;
  name: string;
  capability: StandardCapability | (string & {});
  url: string;
  companyName?: string;
  atsPlatform?: AtsPlatform;
  atsToken?: string;
  maxItems?: number;
  tags?: string[];
  defaultJobType?: "VA" | "freelance" | "project" | "full-time" | "part-time";
  cadenceGroup?: string;
  headers?: Record<string, string>;
  options?: Record<string, unknown>;
}

export interface CapabilityDispatchContext {
  state?: ConditionalState;
  observedAt?: string;
  fetchFn?: typeof fetch;
}

export interface CapabilityDispatchResult<T = NewOpportunity[] | SourceFetchOutput> {
  result: T;
  routing: RoutingMetadata;
}

export interface CapabilityDefinition<
  TSource extends ConventionalSourceConfig = ConventionalSourceConfig,
  TOutput = NewOpportunity[] | SourceFetchOutput
> {
  name: string;
  description: string;
  payloadKind: PayloadKind;
  canHandle: (source: TSource) => boolean;
  dispatch: (source: TSource, context?: CapabilityDispatchContext) => Promise<TOutput>;
}

// ─── Registry Store & Error Classes ──────────────────────────────────────────

export class DuplicateCapabilityError extends Error {
  constructor(name: string) {
    super(`Capability "${name}" is already registered in the CapabilityRegistry.`);
    this.name = "DuplicateCapabilityError";
  }
}

export class UnsupportedCapabilityError extends Error {
  constructor(name: string, available: string[]) {
    super(
      `Unsupported capability "${name}". Registered capabilities: [${available.join(", ")}].`
    );
    this.name = "UnsupportedCapabilityError";
  }
}

export class IncompatibleSourceCapabilityError extends Error {
  constructor(sourceId: string, capability: string, reason: string) {
    super(
      `Source "${sourceId}" declared capability "${capability}" but failed capability precondition: ${reason}`
    );
    this.name = "IncompatibleSourceCapabilityError";
  }
}

/**
 * In-memory typed Capability Registry following Jev 1.13 Variant A
 * (pure typed function map with pluggable capability interface).
 */
export class CapabilityRegistry {
  private readonly capabilities = new Map<string, CapabilityDefinition>();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Registers a new capability. Rejects duplicate or conflicting capability names.
   */
  public register<TSource extends ConventionalSourceConfig = ConventionalSourceConfig>(
    capability: CapabilityDefinition<TSource>
  ): void {
    const key = capability.name.toLowerCase().trim();
    if (this.capabilities.has(key)) {
      throw new DuplicateCapabilityError(capability.name);
    }
    this.capabilities.set(key, capability as CapabilityDefinition);
  }

  /**
   * Checks if a capability name is registered.
   */
  public has(name: string): boolean {
    return this.capabilities.has(name.toLowerCase().trim());
  }

  /**
   * Retrieves a capability definition.
   */
  public get(name: string): CapabilityDefinition | undefined {
    return this.capabilities.get(name.toLowerCase().trim());
  }

  /**
   * Lists all registered capability definitions.
   */
  public list(): CapabilityDefinition[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Lists all registered capability names.
   */
  public listNames(): string[] {
    return Array.from(this.capabilities.keys());
  }

  /**
   * Dispatches a conventional source configuration to its designated capability processor.
   * Emits C17 routing metadata and measures latency.
   */
  public async dispatch<TOutput = NewOpportunity[] | SourceFetchOutput>(
    source: ConventionalSourceConfig,
    context: CapabilityDispatchContext = {}
  ): Promise<CapabilityDispatchResult<TOutput>> {
    const start = Date.now();
    const capKey = source.capability.toLowerCase().trim();
    const handler = this.capabilities.get(capKey);

    if (!handler) {
      throw new UnsupportedCapabilityError(source.capability, this.listNames());
    }

    const warnings: string[] = [];

    if (!handler.canHandle(source)) {
      throw new IncompatibleSourceCapabilityError(
        source.id,
        source.capability,
        `Source configuration does not satisfy canHandle requirements for ${handler.name}`
      );
    }

    const result = (await handler.dispatch(source, context)) as TOutput;
    const durationMs = Date.now() - start;

    const routing: RoutingMetadata = {
      sourceId: source.id,
      declaredCapability: source.capability,
      payloadKind: handler.payloadKind,
      selectedProcessor: handler.name,
      warnings,
      dispatchedAt: context.observedAt ?? new Date().toISOString(),
      durationMs,
    };

    return { result, routing };
  }

  /**
   * Helper to construct a legacy Source compatibility bridge.
   */
  public toLegacySource(config: ConventionalSourceConfig): Source {
    let type: "rss" | "html" | "json" = "json";
    let collectionMethod: "rss_feed" | "public_html" | "public_json_api" = "public_json_api";

    if (config.capability === "rss_xml" || config.capability === "structured_xml") {
      type = "rss";
      collectionMethod = "rss_feed";
    } else if (config.capability === "static_html") {
      type = "html";
      collectionMethod = "public_html";
    }

    return {
      id: config.id,
      name: config.name,
      url: config.url,
      type,
      collectionMethod,
      complianceStatus: "allowed",
      complianceNotes: `Conventionally routed via capability: ${config.capability}`,
      platform: config.companyName ?? config.name,
      defaultJobType: config.defaultJobType ?? "full-time",
      tags: config.tags ?? ["remote"],
      maxItems: config.maxItems,
      cadenceGroup: config.cadenceGroup,
    };
  }

  /**
   * Registers the 5 constitutional standard capabilities.
   */
  private registerDefaults(): void {
    // 1. ats_json — Public JSON ATS APIs (Greenhouse, Lever, Ashby, Breezy, Workable)
    this.register({
      name: "ats_json",
      description: "Public unauthenticated JSON ATS boards and postings APIs",
      payloadKind: "json",
      canHandle: (source) =>
        Boolean(source.atsPlatform && (source.atsToken || source.url)),
      dispatch: async (source) => {
        if (!source.atsPlatform) {
          throw new IncompatibleSourceCapabilityError(
            source.id,
            "ats_json",
            "Missing atsPlatform property"
          );
        }
        const token = source.atsToken || source.url;
        const companyName = source.companyName || source.name;
        return fetchATSFeed(source.atsPlatform, token, companyName);
      },
    });

    // 2. rss_xml — Standard RSS 2.0 / Atom syndication feeds
    this.register({
      name: "rss_xml",
      description: "Standard RSS 2.0 / Atom XML syndication feeds",
      payloadKind: "xml",
      canHandle: (source) => Boolean(source.url && source.url.startsWith("http")),
      dispatch: async (source, context) => {
        const legacySource = this.toLegacySource(source);
        return fetchRSSFeed(legacySource, context?.state);
      },
    });

    // 3. structured_xml — Structured XML job/offer catalogs (Recruitee, Teamtailor)
    this.register({
      name: "structured_xml",
      description: "Structured XML job/offer catalogs with provider-specific schemas",
      payloadKind: "xml",
      canHandle: (source) => Boolean(source.url && source.url.startsWith("http")),
      dispatch: async (source, context) => {
        const urlLower = source.url.toLowerCase();
        const fetchImpl = context?.fetchFn;
        const companyName = source.companyName || source.name;

        if (urlLower.includes("recruitee.com") || urlLower.includes("/offers.xml")) {
          const match = source.url.match(/https?:\/\/([^.]+)\.recruitee\.com/i);
          const subdomain = match ? match[1] : (source.atsToken || source.name.toLowerCase());
          const { postings } = await fetchRecruiteeFeed(subdomain, { fetchImpl });
          return postings.map((p) => ({
            title: p.title,
            company: companyName,
            type: "full-time" as const,
            sourceUrl: p.careersUrl,
            sourcePlatform: companyName,
            tags: [companyName.toLowerCase()],
            locationType: (p.remote ? "remote" : p.onSite ? "onsite" : null) as "remote" | "onsite" | null,
            locationRaw: p.locationSummary,
            postedAt: p.postedAt,
            isActive: true,
            contentHash: toContentHash(p.title, p.careersUrl),
          }));
        }

        if (urlLower.includes("teamtailor.com") || urlLower.includes("/jobs.rss")) {
          let domain = source.url;
          try {
            domain = new URL(source.url).hostname;
          } catch {
            // Keep source.url fallback
          }
          const { postings } = await fetchTeamtailorFeed(domain, { fetchImpl });
          return postings.map((p) => ({
            title: p.title,
            company: companyName,
            type: "full-time" as const,
            sourceUrl: p.link,
            sourcePlatform: companyName,
            tags: [companyName.toLowerCase()],
            locationType: (p.remoteStatus === "hybrid" ? "hybrid" : p.remoteStatus === "none" ? "onsite" : "remote") as "remote" | "hybrid" | "onsite",
            locationRaw: p.locationSummary,
            postedAt: p.postedAt,
            isActive: true,
            contentHash: toContentHash(p.title, p.link),
          }));
        }

        // Fallback to standard RSS parser if schema is standard XML
        const legacySource = this.toLegacySource(source);
        const res = await fetchRSSFeed(legacySource, context?.state);
        return res.items;
      },
    });

    // 4. public_json_api — Public JSON APIs (RemoteOK, Himalayas, custom JSON feeds)
    this.register({
      name: "public_json_api",
      description: "Documented public JSON opportunity endpoints",
      payloadKind: "json",
      canHandle: (source) => Boolean(source.url && source.url.startsWith("http")),
      dispatch: async (source, context) => {
        const legacySource = this.toLegacySource(source);
        return fetchJSONSource(legacySource, context?.state);
      },
    });

    // 5. static_html — Public HTML scraping surfaces
    this.register({
      name: "static_html",
      description: "Static HTML pages with declarative text extraction",
      payloadKind: "html",
      canHandle: (source) => Boolean(source.url && source.url.startsWith("http")),
      dispatch: async (source, context) => {
        const legacySource = this.toLegacySource(source);
        return fetchHTMLSource(legacySource, context?.state);
      },
    });
  }
}

/**
 * Singleton instance of the CapabilityRegistry.
 */
export const defaultCapabilityRegistry = new CapabilityRegistry();
