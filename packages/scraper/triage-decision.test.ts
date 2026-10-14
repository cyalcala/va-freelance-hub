import { describe, expect, test } from "bun:test";
import { decideTriage, mapTriageCategoryToUiCategory } from "./triage-decision";
import { geoGate } from "./geoGate";

// decideTriage is the single verdict shared by the inline scrape loop and the
// Inngest durable-triage worker. These cover the branch table so the two paths
// cannot silently diverge on what publishes vs. what is held back.

function jsonResponse(obj: unknown) {
  return { response: JSON.stringify(obj) };
}

/** Mock Workers AI env that routes triage vs. skeptic prompts by their text. */
function makeEnv(opts: {
  triage: Record<string, unknown>;
  skeptic?: Record<string, unknown>;
  onSkeptic?: () => void;
}) {
  return {
    AI: {
      run: async (_model: string, request: any) => {
        const userMsg = String(
          request?.messages?.find((m: any) => m.role === "user")?.content ?? ""
        );
        if (userMsg.includes("skeptical reviewer")) {
          opts.onSkeptic?.();
          return jsonResponse(opts.skeptic ?? { eligible: true, reason: "ok" });
        }
        return jsonResponse(opts.triage);
      },
    },
  };
}

const baseInput = {
  title: "Virtual Assistant",
  description: "Remote VA role",
  company: "Acme",
  tags: ["va"],
};

describe("decideTriage", () => {
  test("fails closed when the Workers AI binding is missing", async () => {
    const d = await decideTriage(baseInput, { geoScope: "unknown" }, {});
    expect(d.kind).toBe("ai-unavailable");
  });

  test("marks AI-ineligible listings ineligible and skips the skeptic", async () => {
    let skepticCalls = 0;
    const env = makeEnv({
      triage: { eligibleForFilipinos: false, reason: "US residents only", category: "admin", tags: [] },
      onSkeptic: () => { skepticCalls++; },
    });
    const d = await decideTriage(baseInput, { geoScope: "unknown" }, env);
    expect(d.kind).toBe("ineligible");
    if (d.kind === "ineligible") expect(d.reason).toContain("US");
    expect(skepticCalls).toBe(0); // ineligible short-circuits before the second vote
  });

  test("a model rejection does not hide a structured Philippines opening", async () => {
    const input = {
      title: "Bookkeeper",
      description: "Remote accounting for a distributed team",
      company: "Hunt St",
      tags: ["bookkeeping"],
      locationRaw: "Philippines",
    };
    const gate = geoGate({
      title: input.title,
      description: input.description,
      locationRaw: input.locationRaw,
      locationType: "remote",
      tags: input.tags,
    });
    expect(gate.geoScope).toBe("ph_only");
    expect(gate.phEligibility).toBe("eligible_verified");

    let skepticCalls = 0;
    const env = makeEnv({
      triage: { eligibleForFilipinos: false, reason: "model unsure", category: "finance", tags: ["xero"] },
      onSkeptic: () => { skepticCalls++; },
    });
    for (const geoScope of ["ph_only", "apac_incl_ph", "worldwide"] as const) {
      const decision = await decideTriage(input, { geoScope }, env);
      expect(decision.kind).toBe("eligible");
      if (decision.kind === "eligible") {
        expect(decision.skeptic).toBeNull();
        expect(decision.triage.category).toBe("finance");
        expect(decision.triage.eligibleForFilipinos).toBe(true);
      }
    }
    expect(skepticCalls).toBe(0);
  });

  test("a US-citizens phrase still rejects a Philippines-scoped opening", async () => {
    const input = {
      title: "Bookkeeper",
      description: "US citizens only",
      company: "Hunt St",
      tags: ["bookkeeping"],
      locationRaw: "Philippines",
    };
    const env = makeEnv({
      triage: { eligibleForFilipinos: true, reason: "should not be asked", category: "finance", tags: [] },
    });
    const decision = await decideTriage(input, { geoScope: "ph_only" }, env);
    expect(decision.kind).toBe("ineligible");
  });

  test("a structured opening publishes when AI is unavailable", async () => {
    const decision = await decideTriage(
      { ...baseInput, title: "Bookkeeper", description: "Remote accounting for a distributed team" },
      { geoScope: "ph_only" },
      {},
    );
    expect(decision.kind).toBe("eligible");
    if (decision.kind === "eligible") expect(decision.triage.category).toBe("finance");
  });

  test("an unknown opening still fails closed when AI is unavailable", async () => {
    const decision = await decideTriage(baseInput, { geoScope: "unknown" }, {});
    expect(decision.kind).toBe("ai-unavailable");
  });

  test("gate-verified positives publish without a second vote", async () => {
    let skepticCalls = 0;
    const env = makeEnv({
      triage: { eligibleForFilipinos: true, reason: "worldwide", category: "tech", tags: ["react"] },
      onSkeptic: () => { skepticCalls++; },
    });
    const d = await decideTriage(baseInput, { geoScope: "worldwide" }, env);
    expect(d.kind).toBe("eligible");
    expect(skepticCalls).toBe(0); // only geoScope==="unknown" triggers the skeptic
    if (d.kind === "eligible") expect(d.skeptic).toBeNull();
  });

  test("gate-unknown positive publishes when the skeptic agrees", async () => {
    const env = makeEnv({
      triage: { eligibleForFilipinos: true, reason: "remote", category: "admin", tags: ["va"] },
      skeptic: { eligible: true, reason: "could not refute" },
    });
    const d = await decideTriage(baseInput, { geoScope: "unknown" }, env);
    expect(d.kind).toBe("eligible");
    if (d.kind === "eligible") expect(d.skeptic?.eligible).toBe(true);
  });

  test("gate-unknown positive is quarantined on a consensus split", async () => {
    const env = makeEnv({
      triage: { eligibleForFilipinos: true, reason: "remote", category: "admin", tags: ["va"] },
      skeptic: { eligible: false, reason: "requires US work authorization" },
    });
    const d = await decideTriage(baseInput, { geoScope: "unknown" }, env);
    expect(d.kind).toBe("consensus-split");
    if (d.kind === "consensus-split") expect(d.reason).toContain("authorization");
  });
});

describe("mapTriageCategoryToUiCategory", () => {
  test("folds AI categories into the board taxonomy", () => {
    expect(mapTriageCategoryToUiCategory("creative")).toBe("design");
    expect(mapTriageCategoryToUiCategory("customer-support")).toBe("customer-service");
    expect(mapTriageCategoryToUiCategory("social-media")).toBe("marketing");
    expect(mapTriageCategoryToUiCategory("tech")).toBe("tech");
    expect(mapTriageCategoryToUiCategory("something-unknown")).toBe("other");
  });

  test("passes owner-requested ai and writing categories through unchanged", () => {
    expect(mapTriageCategoryToUiCategory("ai")).toBe("ai");
    expect(mapTriageCategoryToUiCategory("writing")).toBe("writing");
  });
});

describe("validateTriageResult category whitelist (TAX-02)", () => {
  test("accepts ai and writing slugs and still coerces unknown ones", async () => {
    for (const cat of ["ai", "writing"]) {
      const env = makeEnv({
        triage: { eligibleForFilipinos: true, reason: "worldwide", category: cat, tags: [] },
      });
      const d = await decideTriage(
        { ...baseInput, title: cat === "ai" ? "AI Engineer" : "Technical Writer" },
        { geoScope: "worldwide" },
        env,
      );
      expect(d.kind).toBe("eligible");
      if (d.kind === "eligible") expect(d.triage.category).toBe(cat);
    }
    const unknownEnv = makeEnv({
      triage: {
        eligibleForFilipinos: true,
        reason: "worldwide",
        category: "knowledge-management",
        tags: [],
      },
    });
    const d = await decideTriage(baseInput, { geoScope: "worldwide" }, unknownEnv);
    expect(d.kind).toBe("eligible");
    // TAX-02 critic fix: writing-family near-misses normalize at validation,
    // so KM-style slugs land on WRITING & CONTENT instead of GENERAL & OTHER.
    if (d.kind === "eligible") expect(d.triage.category).toBe("writing");
  });

  test("mock no-AI categorizer routes AI and writing titles to new buckets", async () => {
    const { triageJob } = await import("./triage");
    const aiResult = await triageJob("Senior AI Engineer", "Build LLM pipelines remotely");
    expect(aiResult.category).toBe("ai");
    const writingResult = await triageJob("Technical Writer", "Produce developer documentation");
    expect(writingResult.category).toBe("writing");
    const kmResult = await triageJob("Knowledge Manager", "Own the company knowledge management program");
    expect(kmResult.category).toBe("writing");
  });
});
