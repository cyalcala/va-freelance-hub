export interface TriageResult {
  eligibleForFilipinos: boolean;
  reason: string;
  category: "admin" | "design" | "tech" | "marketing" | "customer-service" | "finance" | "other";
  tags: string[];
  payRange: string | null;
  clientTimezone: string | null;
  applicationUrl: string | null;
  employmentType: "full-time" | "part-time" | "contract" | "freelance" | null;
  experienceLevel: "entry" | "mid" | "senior" | "any" | null;
  companyName: string | null;
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

    if (text.includes("admin") || text.includes("assistant") || text.includes("data entry")) {
      category = "admin";
      tags.push("assistant", "admin");
    } else if (text.includes("developer") || text.includes("engineer") || text.includes("code") || text.includes("tech")) {
      category = "tech";
      tags.push("software-development", "tech");
    } else if (text.includes("design") || text.includes("writer") || text.includes("creative") || text.includes("copywriter")) {
      category = "design";
      tags.push("creative", "content");
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
  "category": "admin" | "design" | "tech" | "marketing" | "customer-service" | "finance" | "other", // Classify based on these guidelines:
  // - "admin": virtual assistant, data entry, calendar/email management, HR, recruiting, executive assistant, scheduling, office operations.
  // - "design": UI/UX, product design, graphic design, branding, illustration, copywriting, content writing, video editing, motion design, creative producer.
  // - "tech": software engineering, web development, QA, devops, IT support, technical support, data analyst, product manager, scrum master.
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
    ? [env.AI_MODEL]
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

  for (const model of modelsToTry) {
    try {
      const request: Record<string, unknown> = {
        messages: [
          {
            role: "system",
            content: "You are a precise JSON generator. Output only valid JSON objects.",
          },
          { role: "user", content: prompt },
        ],
      };
      // JSON mode (L2): grammar-constrained output kills parse failures on
      // models that support it. Guarded per-model — an unsupported param
      // would otherwise error EVERY rung of the fallback ladder.
      if (typeof model === "string" && model.includes("llama-3.3")) {
        request.response_format = { type: "json_object" };
      }
      const response = await env.AI.run(model, request);

      let jsonText = "";
      if (typeof response === "string") {
        jsonText = response;
      } else if (response && response.response) {
        jsonText = response.response;
      } else if (response && response.text) {
        jsonText = response.text;
      } else {
        jsonText = JSON.stringify(response);
      }

      // Clean up markdown wrapper if LLM returned it anyway
      jsonText = jsonText.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      const parsed: TriageResult = JSON.parse(jsonText);

      // FAIL CLOSED (geo masterplan L2 prefix, 2026-07): a model response
      // missing the eligibility boolean is an unclassified job, not an
      // eligible one — throw so the next fallback model gets a chance, and
      // the final aiUnavailable path fails closed if all models misbehave.
      // Previously this defaulted to `true` and malformed output published.
      if (typeof parsed.eligibleForFilipinos !== "boolean") {
        throw new Error("model output missing boolean eligibleForFilipinos");
      }

      // Validate fields and provide safe fallbacks
      return {
        eligibleForFilipinos: parsed.eligibleForFilipinos,
        reason: parsed.reason || "AI classified",
        category: [
          "admin",
          "design",
          "tech",
          "marketing",
          "customer-service",
          "finance",
          "other",
        ].includes(parsed.category)
          ? parsed.category
          : "other",
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        payRange: typeof parsed.payRange === "string" ? parsed.payRange : null,
        clientTimezone: typeof parsed.clientTimezone === "string" ? parsed.clientTimezone : null,
        applicationUrl: typeof parsed.applicationUrl === "string" ? parsed.applicationUrl : null,
        employmentType: ["full-time", "part-time", "contract", "freelance"].includes(parsed.employmentType as any) ? parsed.employmentType : null,
        experienceLevel: ["entry", "mid", "senior", "any"].includes(parsed.experienceLevel as any) ? parsed.experienceLevel : null,
        companyName: typeof parsed.companyName === "string" ? parsed.companyName : null,
      };
    } catch (error) {
      console.warn(`[triage] Workers AI model ${model} failed for "${title}":`, error);
      lastError = error as Error;
      // Continue to the next fallback model
    }
  }

  console.error(`[triage] ALL Workers AI models failed for "${title}". Last error:`, lastError);
  // Defense-in-depth: callers already skip on aiUnavailable, but the
  // eligibility flag itself must also never read `true` for an unclassified
  // job (it previously did — harmless only as long as every caller checked).
  return {
    eligibleForFilipinos: false,
    reason: `Workers AI error fallback (all models failed): ${lastError?.message}`,
    category: "other",
    tags: ["remote"],
    payRange: null,
    clientTimezone: null,
    applicationUrl: null,
    employmentType: null,
    experienceLevel: null,
    companyName: null,
    aiUnavailable: true,
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
  if (!env || !env.AI) {
    return { eligible: true, reason: "Skeptic unavailable (no AI binding)", aiUnavailable: true };
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

  const models = env?.AI_MODEL
    ? [env.AI_MODEL]
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
      let jsonText = typeof response === "string" ? response : (response?.response ?? response?.text ?? JSON.stringify(response));
      jsonText = String(jsonText).trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(jsonText);
      if (typeof parsed.eligible !== "boolean") throw new Error("skeptic output missing boolean eligible");
      return { eligible: parsed.eligible, reason: typeof parsed.reason === "string" ? parsed.reason : "" };
    } catch (error) {
      console.warn(`[triage] Skeptic model ${model} failed for "${title}":`, error);
    }
  }
  // Never block ingestion on a skeptic outage — the first vote plus the
  // deterministic gate still stand; the caller records single-vote status.
  return { eligible: true, reason: "Skeptic unavailable (all models failed)", aiUnavailable: true };
}
