export interface TriageResult {
  eligibleForFilipinos: boolean;
  reason: string;
  category: "admin" | "creative" | "tech" | "social-media" | "customer-support" | "finance" | "other";
  tags: string[];
  payRange: string | null;
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

/**
 * Perform a fast, low-cost regex/heuristic check for geo-restrictions
 */
export function isObviousGeoRestriction(title: string, description: string): boolean {
  const content = `${title} ${description}`.toLowerCase();
  return GEOGRAPHIC_EXCLUSION_REGEX.test(content);
}

/**
 * Intelligently classifies and verifies eligibility of a job listing using Cloudflare Workers AI (Llama 3.1)
 */
export async function triageJob(
  title: string,
  description: string,
  env?: any
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
      category = "creative";
      tags.push("creative", "content");
    } else if (text.includes("social") || text.includes("instagram") || text.includes("facebook") || text.includes("marketing")) {
      category = "social-media";
      tags.push("marketing", "social-media");
    } else if (text.includes("support") || text.includes("customer") || text.includes("chat")) {
      category = "customer-support";
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
    };
  }

  // 3. Call Cloudflare Workers AI
  const prompt = `
You are an expert AI job triager for "Remote PH Jobs", a site that matches remote jobs to Filipino freelancers and virtual assistants.
Analyze the following job details and output a valid JSON object matching the schema below.

Job Title: ${title}
Job Description Summary:
${cleanDescription}

Requirements for output JSON schema:
{
  "eligibleForFilipinos": boolean, // Must be true unless the job specifies only US, UK, Canada, Europe, or other specific locations/citizenship exclusions. If the job is open "globally" or "worldwide" or "remote", it is true.
  "reason": "string", // Brief explanation of eligibility or location rules.
  "category": "admin" | "creative" | "tech" | "social-media" | "customer-support" | "finance" | "other", // Pick the most relevant.
  "tags": ["string"], // Array of 2 to 4 technical skills or tools needed.
  "payRange": "string" // Extract pay rate (e.g. "$15 - $20/hr" or "$3000/mo") if mentioned, else null.
}

Output ONLY the raw JSON object. Do not wrap in markdown code blocks. Do not write any conversational text.
  `.trim();

  try {
    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a precise JSON generator. Output only valid JSON objects.",
        },
        { role: "user", content: prompt },
      ],
      // We parse the string response. Cloudflare Workers AI also supports JSON mode.
    });

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
    
    // Validate fields and provide safe fallbacks
    return {
      eligibleForFilipinos: typeof parsed.eligibleForFilipinos === "boolean" ? parsed.eligibleForFilipinos : true,
      reason: parsed.reason || "AI classified",
      category: [
        "admin",
        "creative",
        "tech",
        "social-media",
        "customer-support",
        "finance",
        "other",
      ].includes(parsed.category)
        ? parsed.category
        : "other",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      payRange: typeof parsed.payRange === "string" ? parsed.payRange : null,
    };
  } catch (error) {
    console.error(`[triage] Workers AI call failed for "${title}":`, error);
    return {
      eligibleForFilipinos: true,
      reason: `Workers AI error fallback: ${(error as Error).message}`,
      category: "other",
      tags: ["remote"],
      payRange: null,
    };
  }
}
