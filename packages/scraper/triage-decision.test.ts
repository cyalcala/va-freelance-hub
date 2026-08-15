import { describe, expect, test } from "bun:test";
import { decideTriage, mapTriageCategoryToUiCategory } from "./triage-decision";

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
});
