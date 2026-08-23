export interface TriageResult {
  eligibleForFilipinos: boolean;
  reason: string;
  category: "admin" | "design" | "tech" | "marketing" | "customer-service" | "finance" | "writing" | "ai" | "other";
  tags: string[];
  payRange: string | null;
  clientTimezone: string | null;
  applicationUrl: string | null;
  employmentType: "full-time" | "part-time" | "contract" | "freelance" | null;
  experienceLevel: "entry" | "mid" | "senior" | "any" | null;
  companyName: string | null;
  /** Safe, bounded provider/error signatures when the entire cascade fails. */
  providerFailures?: string[];
  // True when no AI model actually classified this job (binding missing or
  // every model failed). Callers must treat such results as UNCLASSIFIED and
  // must not persist them as eligible — previously these failed open and an
  // AI outage silently filled the board with unfiltered listings.
  aiUnavailable?: boolean;
}

// Simple regex list for obvious geo-exclusion checks before running LLM (saves tokens)
const GEOGRAPHIC_EXCLUSION_REGEX = new RegExp(
  "\\b(" +
  [
    "us only",
    "united states only",
    "us citizens? only",
    "us residents? only",
    "uk only",
    "united kingdom only",
    "uk residents? only",
    "canada only",
    "canadian residents? only",
    "europe only",
    "european residents? only",
    "must be in the us",
    "must reside in the us",
    "must be located in the us",
    "must be us resident",
    "authorized to work in the us",
    "authorized to work in us",
    "citizenship required",
    "work from the us",
    "us timezone only",
    "est only",
    "pst only",
    "mst only",
    "cst only",
    "north america only"
  ].join("|") +
  ")\\b",
  "i"
);

const LOCAL_OR_NON_ENGLISH_REGEX = new RegExp(
  "\\b(" +
  [
    "m/w/d",
    "w/m/d",
    "m/w/x",
    "d/m/w",
    "h/f",
    "werkstudent",
    "werkstudenten",
    "alternance",
    "apprentissage",
    "cdd",
    "cdi",
    "praktikum",
    "praktikant",
    "stagiaire",
    "stellenangebot",
    "vollzeit",
    "teilzeit"
  ].join("|") +
  ")\\b",
  "i"
);

/**
 * Perform a fast, low-cost regex/heuristic check for geo-restrictions
 */
export function isObviousGeoRestriction(title: string, description: string): boolean {
  const content = `${title} ${description}`.toLowerCase();
  return GEOGRAPHIC_EXCLUSION_REGEX.test(content);
}

/**
 * Perform a fast check for non-English or localized EU-only terms
 */
export function isObviousNonEnglishOrLocalOnly(title: string, description: string): boolean {
  const content = `${title} ${description}`.toLowerCase();
  return LOCAL_OR_NON_ENGLISH_REGEX.test(content);
}

/** Extra structured context for triage (geo masterplan L2, 2026-07). */
export interface TriageContext {
  /** Structured location string from the source (RemoteOK location, WWR region, ATS offices). */
  locationRaw?: string | null;
  /** Source-provided tags — RemoteOK tags the posting language (e.g. "italian"). */
  tags?: string[] | null;
  company?: string | null;
}

function contextBlock(context?: TriageContext): string {
  if (!context) return "";
  const lines: string[] = [];
  if (context.locationRaw) lines.push(`Source-listed location: ${context.locationRaw}`);
  if (context.tags?.length) lines.push(`Source tags: ${context.tags.slice(0, 12).join(", ")}`);
  if (context.company) lines.push(`Company: ${context.company}`);
  return lines.length ? `\n${lines.join("\n")}` : "";
}

/**
 * Parses the AI_MODEL override into a model ladder.
 *
 * Accepts a comma-separated list so a caller can pick a *cheaper ladder*
 * rather than a single model. This matters: callers override AI_MODEL to keep
 * the expensive 70B rung out of high-volume paths, but a one-element ladder has
 * no fallback, and JSON mode is only enabled for llama-3.3 (see below) — so a
 * single free-form parse failure fails the whole call closed as aiUnavailable.
 * The unclear-backlog sweep hit exactly that: pinned to one 8B model it resolved
 * nothing and merely rotated rows.
 */
/**
 * Parses a model response that is supposed to be JSON but may not be.
 *
 * JSON mode (`response_format`) is only enabled for llama-3.3, so every other
 * rung returns free-form text and may wrap the object in prose ("Sure! Here's
 * the JSON: {...}"). Strict JSON.parse rejects that, the rung is treated as a
 * failure, and once the whole ladder is consumed the call fails closed as
 * aiUnavailable. In production that silently disabled the backlog sweep on every
 * cheap rung. Falling back to the outermost {...} span recovers those responses.
 *
 * Returns null when nothing parseable is present, so callers keep failing closed
 * rather than inventing a verdict.
 */
export function parseLooseJson<T = any>(raw: string): T | null {
  const text = (raw || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

export function parseModelOverride(override: unknown): string[] {
  if (Array.isArray(override)) return override.map(String).map((s) => s.trim()).filter(Boolean);
  return String(override)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// TAX-02: near-miss synonyms for the owner-priority writing family, normalized
// at the single validation choke point BEFORE whitelist coercion. Cheap models
// emitting e.g. "copywriting" or "knowledge-management" must land on the
// flagship WRITING & CONTENT surface, not GENERAL & OTHER.
const WRITING_FAMILY_ALIASES: ReadonlySet<string> = new Set([
  "copywriting",
  "technical-writing",
  "knowledge-management",
  "content-production",
]);

// Coerce a raw parsed model object into a validated TriageResult with safe
// fallbacks. Shared by the Cloudflare ladder and the Gemini fallback so the two
// providers can never drift on field validation.
export function validateTriageResult(parsed: any): TriageResult {
  const rawCategory = typeof parsed.category === "string" ? parsed.category.trim().toLowerCase() : "";
  const normalizedCategory = WRITING_FAMILY_ALIASES.has(rawCategory) ? "writing" : rawCategory;
  return {
    eligibleForFilipinos: parsed.eligibleForFilipinos,
    reason: parsed.reason || "AI classified",
    category: [
      "admin", "design", "tech", "marketing", "customer-service", "finance", "writing", "ai", "other",
    ].includes(normalizedCategory) ? normalizedCategory as TriageResult["category"] : "other",
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
    payRange: typeof parsed.payRange === "string" ? parsed.payRange : null,
    clientTimezone: typeof parsed.clientTimezone === "string" ? parsed.clientTimezone : null,
    applicationUrl: typeof parsed.applicationUrl === "string" ? parsed.applicationUrl : null,
    employmentType: ["full-time", "part-time", "contract", "freelance"].includes(parsed.employmentType as any) ? parsed.employmentType : null,
    experienceLevel: ["entry", "mid", "senior", "any"].includes(parsed.experienceLevel as any) ? parsed.experienceLevel : null,
    companyName: typeof parsed.companyName === "string" ? parsed.companyName : null,
  };
}

// True when a Workers AI error means the shared account allocation is spent
// (10k-neuron/day cap, error 4006) or the invocation hit Cloudflare's subrequest
// ceiling — i.e. every other rung will fail identically, so the ladder should
// stop and fall back rather than burn more subrequests re-confirming it.
export function isQuotaExhaustionError(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    m.includes("4006") ||
    m.includes("neuron") ||
    m.includes("too many subrequests") ||
    m.includes("capacity") ||
    m.includes("daily") ||
    m.includes("quota")
  );
}

// Free-tier AI fallback. When Cloudflare Workers AI is exhausted/unavailable and
// a GEMINI_API_KEY is configured, classify one listing via Google's Gemini free
// tier (Flash-Lite: ~1k-1.5k req/day, far larger than the neuron budget's
// ~50-200 triages/day) rather than failing closed. Same prompt, same validated
// shape as the Cloudflare path. Returns null on any failure so the caller falls
// through to its normal fail-closed defer.
// Default Gemini models. Flash-Lite is the high-volume workhorse (~1k-1.5k/day
// free); Flash is more capable but lower-volume (~250/day), reserved for the
// critical skeptic vote. Both overridable via GEMINI_MODEL / GEMINI_CRITICAL_MODEL.
export const GEMINI_BULK_MODEL = "gemini-2.5-flash-lite";
export const GEMINI_CRITICAL_MODEL = "gemini-2.5-flash";

// Raw Gemini generateContent call → returns the model's text output. Throws on
// any HTTP error (429 rate-limit, 5xx, quota) so callers can fall back or defer.
// Shared by triage and the skeptic so the two never drift on request shape.
export async function geminiGenerateContent(
  prompt: string,
  apiKey: string,
  model?: unknown,
  fallbackModel: string = GEMINI_BULK_MODEL,
): Promise<string> {
  const geminiModel = (typeof model === "string" && model.trim()) || fallbackModel;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Force raw JSON out (no markdown fences) and make the verdict deterministic.
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}`);
  }
  const data: any = await res.json();
  return (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

export async function triageViaGemini(
  prompt: string,
  apiKey: string,
  model?: unknown,
): Promise<TriageResult | null> {
  const text = await geminiGenerateContent(prompt, apiKey, model, GEMINI_BULK_MODEL);
  const parsed = parseLooseJson<any>(text);
  // FAIL CLOSED: an unclassified job is not an eligible one.
  if (!parsed || typeof parsed.eligibleForFilipinos !== "boolean") return null;
  return validateTriageResult(parsed);
}

// Groq is the SECOND free provider — it absorbs Gemini's rate-limit/quota
// overflow (30 RPM, very fast LPU inference) before the Cloudflare neuron reserve
// is ever touched. 70B-versatile is capable enough for both bulk and the critical
// skeptic vote; its ~100k-token/day cap is fine because it only sees overflow.
export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

// Raw Groq chat/completions call (OpenAI-compatible) → model text output. Throws
// on any HTTP error (429/5xx) so callers can fall through to the next provider.
export async function groqGenerateContent(
  prompt: string,
  apiKey: string,
  model?: unknown,
): Promise<string> {
  const groqModel = (typeof model === "string" && model.trim()) || GROQ_DEFAULT_MODEL;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: groqModel,
      messages: [
        { role: "system", content: "You are a precise JSON generator. Output only valid JSON objects." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Groq HTTP ${res.status}`);
  }
  const data: any = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? "").trim();
}

export async function triageViaGroq(
  prompt: string,
  apiKey: string,
  model?: unknown,
): Promise<TriageResult | null> {
  const text = await groqGenerateContent(prompt, apiKey, model);
  const parsed = parseLooseJson<any>(text);
  if (!parsed || typeof parsed.eligibleForFilipinos !== "boolean") return null;
  return validateTriageResult(parsed);
}

/**
 * Intelligently classifies and verifies eligibility of a job listing using
 * Cloudflare Workers AI. Model ladder (L2): llama-3.3-70b (fp8-fast, far
 * better geo nuance) → llama-3.1-8b → mistral-7b.
 */
export async function triageJob(
  title: string,
  description: string,
  env?: any,
  context?: TriageContext
): Promise<TriageResult> {
  const cleanDescription = (description || "").slice(0, 1500); // limit payload size

  // 1. Perform heuristic check first
  if (isObviousGeoRestriction(title, cleanDescription)) {
    return {
      eligibleForFilipinos: false,
      reason: "Obvious geo-restriction detected by heuristic keyword filter.",
      category: "other",
      tags: [],
      payRange: null,
      clientTimezone: null,
      applicationUrl: null,
      employmentType: null,
      experienceLevel: null,
      companyName: null,
    };
  }

  if (isObviousNonEnglishOrLocalOnly(title, cleanDescription)) {
    return {
      eligibleForFilipinos: false,
      reason: "Obvious non-English or localized EU-only role (e.g. m/w/d, Werkstudent, Alternance) detected by heuristic pre-filter.",
      category: "other",
      tags: [],
      payRange: null,
      clientTimezone: null,
      applicationUrl: null,
      employmentType: null,
      experienceLevel: null,
      companyName: null,
    };
  }

  // 2. If running without Cloudflare Workers AI binding (e.g. local scripts), fallback to basic tags & eligibility
  if (!env || !env.AI) {
    // Basic heuristic categorizer for local development
    let category: TriageResult["category"] = "other";
    const tags: string[] = [];
    const text = `${title} ${cleanDescription}`.toLowerCase();

    if (
      text.includes("ai engineer") ||
      text.includes("ai specialist") ||
      text.includes("ai operations") ||
      text.includes("prompt engineer") ||
      text.includes("machine learning") ||
      text.includes("artificial intelligence") ||
      text.includes("generative ai")
    ) {
      category = "ai";
      tags.push("ai", "automation");
    } else if (
      text.includes("writer") ||
      text.includes("writing") ||
      text.includes("copywriter") ||
      text.includes("content producer") ||
      text.includes("content production") ||
      text.includes("editorial") ||
      text.includes("journalist") ||
      text.includes("knowledge management")
    ) {
      category = "writing";
      tags.push("writing", "content");
    } else if (text.includes("admin") || text.includes("assistant") || text.includes("data entry")) {
      category = "admin";
      tags.push("assistant", "admin");
    } else if (text.includes("developer") || text.includes("engineer") || text.includes("code") || text.includes("tech")) {
      category = "tech";
      tags.push("software-development", "tech");
    } else if (text.includes("design") || text.includes("creative") || text.includes("illustrat")) {
      category = "design";
      tags.push("creative", "design");
    } else if (text.includes("social") || text.includes("instagram") || text.includes("facebook") || text.includes("marketing")) {
      category = "marketing";
      tags.push("marketing", "social-media");
    } else if (text.includes("support") || text.includes("customer") || text.includes("chat")) {
      category = "customer-service";
      tags.push("customer-support", "helpdesk");
    } else if (text.includes("bookkeeper") || text.includes("accounting") || text.includes("finance")) {
      category = "finance";
      tags.push("finance", "accounting");
    }

    return {
      eligibleForFilipinos: true,
      reason: "Mock classification (Workers AI binding env.AI is not available)",
      category,
      tags: tags.length ? tags : ["remote"],
      payRange: null,
      clientTimezone: null,
      applicationUrl: null,
      employmentType: null,
      experienceLevel: null,
      companyName: null,
      aiUnavailable: true,
    };
  }

  // 3. Call Cloudflare Workers AI
  const prompt = `
You are an expert AI job triager for "Remote PH Jobs", a site that matches remote jobs to Filipino freelancers and virtual assistants.
Analyze the following job details and output a valid JSON object matching the schema below.

Job Title: ${title}${contextBlock(context)}
Job Description Summary:
${cleanDescription}

Eligibility examples (learn the pattern):
- Italian-language posting "Addetto a Customer Service" for a Swiss casino → eligibleForFilipinos: false (non-English, targets the local Swiss/Italian market).
- Source-listed location "Florida, United States" → false (pinned to a US location even though listed as remote).
- "Must be based in the EU" / "US work authorization required" → false (hard residence/authorization lock).
- Source-listed location "Anywhere in the World" → true (explicitly worldwide).
- "Hiring for our Philippines team, must reside in the Philippines" → true (PH-targeted is exactly what we want).
- "Must overlap 4 hours with EST business hours" → true (timezone OVERLAP is fine — Filipino VAs routinely work night shift; only residence locks disqualify).

Requirements for output JSON schema:
{
  "eligibleForFilipinos": boolean, // Set to false if: 1) the job requires residency/citizenship in specific non-PH regions (like US only, Europe only), 2) the job is written in a non-English language (German, French, etc.), 3) it requires local university enrollment or national student/apprentice schemes (like German Werkstudent, French Alternance/Apprentissage), 4) it contains localized legal gender abbreviations (like m/w/d, H/F), or 5) the source-listed location pins it to a specific non-PH country, state, or city. Otherwise, if the job is open globally, remote, or to the Philippines, set to true.
  "reason": "string", // Brief explanation of eligibility or location rules.
  "category": "admin" | "design" | "tech" | "marketing" | "customer-service" | "finance" | "writing" | "ai" | "other", // Classify based on these guidelines:
  // - "admin": virtual assistant, data entry, calendar/email management, HR, recruiting, executive assistant, scheduling, office operations.
  // - "writing": technical writing, professional writing, content writing, copywriting, content production, editorial, journalism, documentation, knowledge management, knowledge base curation.
  // - "ai": AI engineer, applied AI, AI operations, AI product roles, prompt engineering, machine learning, LLM/GenAI engineering, AI automation specialist.
  // - "design": UI/UX, product design, graphic design, branding, illustration, video editing, motion design, creative producer.
  // - "tech": software engineering, web development, QA, devops, IT support, technical support, data analyst, product manager, scrum master. (Pure AI/ML-specialist roles belong to "ai", not "tech".)
  // - "marketing": sales, business development, marketing coordinator, SEO, social media management, lead generation, CRM management, email marketing, growth.
  // - "customer-service": customer support, chat support, email support, helpdesk, ticketing, customer service representative.
  // - "finance": accounting, bookkeeping, financial analysis, billing, payroll, collections.
  // - "other": any general roles that do not fit the above categories.
  "tags": ["string"], // Array of 2 to 4 technical skills or tools needed.
  "payRange": "string", // ONLY extract if explicitly stated in text, otherwise return null. Do NOT guess.
  "clientTimezone": "string", // ONLY extract if explicitly stated (e.g. "EST", "AEST", "Australian Dayshift"), otherwise return null. Do NOT guess.
  "applicationUrl": "string", // Direct email address or apply link found within the description text, else null.
  "employmentType": "full-time" | "part-time" | "contract" | "freelance" | null, // Extract the type of employment if mentioned.
  "experienceLevel": "entry" | "mid" | "senior" | "any" | null, // Extract the required experience level if mentioned.
  "companyName": "string" // Extract the name of the hiring company if explicitly mentioned in the description, otherwise return null.
}

Output ONLY the raw JSON object. Do not wrap in markdown code blocks. Do not write any conversational text.
  `.trim();

  const modelsToTry = env?.AI_MODEL
    ? parseModelOverride(env.AI_MODEL)
    : [
        // L2 model upgrade: 70B fp8-fast first — dramatically better at geo
        // nuance than the 8B models and still on the Workers AI free tier.
        // If its quota runs dry the ladder degrades to the cheaper models,
        // and if everything fails the caller fails closed (aiUnavailable).
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        "@cf/meta/llama-3.1-8b-instruct",
        "@cf/meta/llama-3-8b-instruct",
        "@cf/mistral/mistral-7b-instruct-v0.1"
      ];

  let lastError: Error | null = null;
  const providerFailures: string[] = [];
  const geminiKey = env?.GEMINI_API_KEY;
  const groqKey = env?.GROQ_API_KEY;
  // Provider order. Gemini Flash-Lite is the default PRIMARY when configured (its
  // ~1k-1.5k/day free tier dwarfs the ~50-200 triages the 10k-neuron/day CF budget
  // affords); Groq is the second free provider, absorbing Gemini's rate-limit /
  // quota overflow (30 RPM, fast LPU) BEFORE the Cloudflare neuron reserve is
  // touched; Cloudflare AI is the reserved BACKUP, fired only when both free
  // providers fail. Set AI_PRIMARY=cloudflare to invert to the CF-first order.
  const primaryIsGemini = Boolean(geminiKey) && String(env?.AI_PRIMARY ?? "gemini") !== "cloudflare";

  // Cloudflare Workers AI model ladder (reserve). Returns a validated result, or
  // null if every rung failed (lastError holds why; __cfAiExhausted is set on 4006
  // so later listings this run skip the dead ladder).
  const tryCloudflare = async (): Promise<TriageResult | null> => {
    if (!env?.AI || env?.__cfAiExhausted === true) return null;
    for (const model of modelsToTry) {
      try {
        const request: Record<string, unknown> = {
          messages: [
            { role: "system", content: "You are a precise JSON generator. Output only valid JSON objects." },
            { role: "user", content: prompt },
          ],
        };
        // JSON mode (L2): grammar-constrained output kills parse failures on
        // models that support it. Guarded per-model.
        if (typeof model === "string" && model.includes("llama-3.3")) {
          request.response_format = { type: "json_object" };
        }
        const response = await env.AI.run(model, request);
        let jsonText = "";
        if (typeof response === "string") jsonText = response;
        else if (response && response.response) jsonText = String(response.response);
        else if (response && response.text) jsonText = String(response.text);
        else jsonText = JSON.stringify(response);
        jsonText = jsonText.trim();
        if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
        if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
        if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
        jsonText = jsonText.trim();
        const parsed = parseLooseJson<TriageResult>(jsonText);
        if (!parsed) throw new Error("Model response was not parseable JSON");
        // FAIL CLOSED: a response missing the eligibility boolean is unclassified.
        if (typeof parsed.eligibleForFilipinos !== "boolean") {
          throw new Error("model output missing boolean eligibleForFilipinos");
        }
        return validateTriageResult(parsed);
      } catch (error) {
        console.warn(`[triage] Workers AI model ${model} failed for "${title}":`, error);
        lastError = error as Error;
        providerFailures.push(`Cloudflare ${model}: ${(error as Error)?.message ?? String(error)}`.slice(0, 180));
        if (isQuotaExhaustionError(error)) {
          if (env) env.__cfAiExhausted = true;
          break;
        }
      }
    }
    return null;
  };

  // A free HTTP provider (Gemini / Groq), charged against the shared subrequest
  // budget so the 50-cap holds. Swallows failures to null so the cascade advances.
  const tryHttp = async (
    label: string,
    fn: () => Promise<TriageResult | null>,
  ): Promise<TriageResult | null> => {
    try {
      (env as { chargeAiSubrequest?: () => void })?.chargeAiSubrequest?.();
      const result = await fn();
      if (!result) {
        lastError = new Error(`${label} returned an invalid response`);
        providerFailures.push(`${label}: invalid response`);
      }
      return result;
    } catch (error) {
      console.warn(`[triage] ${label} failed for "${title}":`, error);
      lastError = error as Error;
      providerFailures.push(`${label}: ${(error as Error)?.message ?? String(error)}`.slice(0, 180));
      return null;
    }
  };
  const tryGemini = (): Promise<TriageResult | null> =>
    geminiKey ? tryHttp("Gemini", () => triageViaGemini(prompt, geminiKey, env?.GEMINI_MODEL)) : Promise.resolve(null);
  const tryGroq = (): Promise<TriageResult | null> =>
    groqKey ? tryHttp("Groq", () => triageViaGroq(prompt, groqKey, env?.GROQ_MODEL)) : Promise.resolve(null);

  // Cascade: free providers first (Gemini → Groq), Cloudflare reserve last — or
  // CF first when AI_PRIMARY=cloudflare.
  const order = primaryIsGemini
    ? [tryGemini, tryGroq, tryCloudflare]
    : [tryCloudflare, tryGemini, tryGroq];
  for (const attempt of order) {
    const result = await attempt();
    if (result) return result;
  }

  console.error(`[triage] All AI providers failed for "${title}". Last error:`, lastError);
  const providerSummary = providerFailures.join(" | ").slice(0, 500);
  // FAIL CLOSED: an unclassified job must never read eligible=true.
  return {
    eligibleForFilipinos: false,
    reason: `AI unavailable (all providers failed): ${providerSummary || (lastError as Error | null)?.message || "unknown"}`,
    category: "other",
    tags: ["remote"],
    payRange: null,
    clientTimezone: null,
    applicationUrl: null,
    employmentType: null,
    experienceLevel: null,
    companyName: null,
    aiUnavailable: true,
    providerFailures,
  };
}

// ─── Consensus skeptic (geo masterplan L2) ───────────────────────────────────

export interface SkepticVerdict {
  eligible: boolean;
  reason: string;
  /** True when no model produced a usable verdict — caller decides the tie-break. */
  aiUnavailable?: boolean;
}

/**
 * Second, adversarial vote before publishing a job whose only eligibility
 * signal is one AI pass. Prompted to REFUTE: a different framing than
 * triageJob's, so the two votes fail differently. Disagreement → the caller
 * quarantines instead of publishing.
 */
export async function skepticEligibilityCheck(
  title: string,
  description: string,
  env?: any,
  context?: TriageContext
): Promise<SkepticVerdict> {
  const geminiKey = env?.GEMINI_API_KEY;
  const groqKey = env?.GROQ_API_KEY;
  if (!env?.AI && !geminiKey && !groqKey) {
    return { eligible: true, reason: "Skeptic unavailable (no AI provider)", aiUnavailable: true };
  }

  const prompt = `
You are a skeptical reviewer for a Filipino remote-jobs board. Another reviewer approved this job as open to applicants living in the Philippines. Your job is to try to REFUTE that.

Job Title: ${title}${contextBlock(context)}
Job Description:
${(description || "").slice(0, 1200)}

Look for ANY disqualifier: non-English posting language; residency, citizenship, or work-authorization requirements outside the Philippines; the listed location pinning it to a specific non-PH country/state/city; onsite or hybrid requirements; local statutory schemes (Werkstudent, Alternance, m/w/d). Timezone-overlap requirements alone do NOT disqualify.

Output ONLY raw JSON: {"eligible": boolean, "reason": "one short sentence"}.
"eligible" is false if you found a genuine disqualifier, true if you could not refute it.
  `.trim();

  const primaryIsGemini = Boolean(geminiKey) && String(env?.AI_PRIMARY ?? "gemini") !== "cloudflare";

  const parseSkeptic = (raw: string): SkepticVerdict | null => {
    const jsonText = String(raw).trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
    const parsed = parseLooseJson<{ eligible?: unknown; reason?: unknown }>(jsonText);
    if (!parsed || typeof parsed.eligible !== "boolean") return null;
    return { eligible: parsed.eligible, reason: typeof parsed.reason === "string" ? parsed.reason : "" };
  };

  // Free HTTP provider vote, charged against the shared subrequest budget.
  const tryHttpSkeptic = async (label: string, fn: () => Promise<string>): Promise<SkepticVerdict | null> => {
    try {
      (env as { chargeAiSubrequest?: () => void })?.chargeAiSubrequest?.();
      return parseSkeptic(await fn());
    } catch (error) {
      console.warn(`[triage] Skeptic ${label} failed for "${title}":`, error);
      return null;
    }
  };
  // Critical vote → the more capable free models: Gemini 2.5 Flash, then Groq 70B.
  const tryGeminiSkeptic = () =>
    geminiKey ? tryHttpSkeptic("Gemini", () => geminiGenerateContent(prompt, geminiKey, env?.GEMINI_CRITICAL_MODEL, GEMINI_CRITICAL_MODEL)) : Promise.resolve(null);
  const tryGroqSkeptic = () =>
    groqKey ? tryHttpSkeptic("Groq", () => groqGenerateContent(prompt, groqKey, env?.GROQ_MODEL)) : Promise.resolve(null);

  // Cloudflare 70B reserve.
  const tryCfSkeptic = async (): Promise<SkepticVerdict | null> => {
    if (!env?.AI || env?.__cfAiExhausted === true) return null;
    const models = env?.AI_MODEL
      ? parseModelOverride(env.AI_MODEL)
      : ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct"];
    for (const model of models) {
      try {
        const request: Record<string, unknown> = {
          messages: [
            { role: "system", content: "You are a precise JSON generator. Output only valid JSON objects." },
            { role: "user", content: prompt },
          ],
        };
        if (typeof model === "string" && model.includes("llama-3.3")) {
          request.response_format = { type: "json_object" };
        }
        const response = await env.AI.run(model, request);
        const raw = typeof response === "string" ? response : (response?.response ?? response?.text ?? JSON.stringify(response));
        const verdict = parseSkeptic(raw);
        if (verdict) return verdict;
        throw new Error("skeptic output not parseable / missing boolean eligible");
      } catch (error) {
        console.warn(`[triage] Skeptic CF model ${model} failed for "${title}":`, error);
        if (isQuotaExhaustionError(error)) { if (env) env.__cfAiExhausted = true; break; }
      }
    }
    return null;
  };

  const order = primaryIsGemini
    ? [tryGeminiSkeptic, tryGroqSkeptic, tryCfSkeptic]
    : [tryCfSkeptic, tryGeminiSkeptic, tryGroqSkeptic];
  for (const attempt of order) {
    const verdict = await attempt();
    if (verdict) return verdict;
  }

  // Never block ingestion on a skeptic outage — the first vote plus the
  // deterministic gate still stand; the caller records single-vote status.
  return { eligible: true, reason: "Skeptic unavailable (all providers failed)", aiUnavailable: true };
}
