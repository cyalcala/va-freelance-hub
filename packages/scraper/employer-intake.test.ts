import { describe, it, expect } from "bun:test";
import {
  parseIssueForm,
  containsSecretLikeContent,
  containsCandidateDataMarkers,
  buildEmployerCandidateRow,
  employerSourceId,
  checkDuplicate,
  EMPLOYER_PROVIDER_ID,
} from "./employer-intake";

function issueBody(overrides: Partial<{
  feedUrl: string; companyName: string; contactEmail: string;
  authorityChecked: boolean; contentScope: string; removalPreference: string;
}> = {}): string {
  const o = {
    feedUrl: "https://careers.acme-corp.com/jobs.xml",
    companyName: "Acme Corp",
    contactEmail: "hiring@acme-corp.com",
    authorityChecked: true,
    contentScope: "Minimal facts only (title, company, location, apply link)",
    removalPreference: "Email hiring@acme-corp.com to request removal at any time.",
    ...overrides,
  };
  return `### Feed or careers page URL

${o.feedUrl}

### Company name

${o.companyName}

### Contact email

${o.contactEmail}

### Authorization

- [${o.authorityChecked ? "x" : " "}] I confirm I am authorized to submit this feed on behalf of the company named above, and that it contains only publicly listed job postings.

### Content scope preference

${o.contentScope}

### Removal / opt-out preference

${o.removalPreference}
`;
}

describe("employer-intake — parseIssueForm (SP-16 criterion 1: candidate only, cannot publish automatically)", () => {
  it("parses a well-formed submission", () => {
    const result = parseIssueForm(issueBody());
    expect(result.ok).toBe(true);
    expect(result.data?.feedUrl).toBe("https://careers.acme-corp.com/jobs.xml");
    expect(result.data?.companyName).toBe("Acme Corp");
    expect(result.data?.contactEmail).toBe("hiring@acme-corp.com");
    expect(result.data?.authorityConfirmed).toBe(true);
  });

  it("handles GitHub's '_No response_' rendering for an unanswered optional field", () => {
    const body = issueBody({ contentScope: "_No response_" });
    const result = parseIssueForm(body);
    expect(result.ok).toBe(true);
    expect(result.data?.contentScope).toBe("");
  });

  it("rejects a non-https feed URL", () => {
    const result = parseIssueForm(issueBody({ feedUrl: "http://careers.acme-corp.com/jobs.xml" }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("https"))).toBe(true);
  });

  it("rejects a missing feed URL", () => {
    const result = parseIssueForm(issueBody({ feedUrl: "" }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Feed or careers page URL is required"))).toBe(true);
  });

  it("rejects a missing company name", () => {
    const result = parseIssueForm(issueBody({ companyName: "" }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Company name"))).toBe(true);
  });

  it("rejects an implausible contact email", () => {
    const result = parseIssueForm(issueBody({ contactEmail: "not-an-email" }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Contact email"))).toBe(true);
  });

  it("rejects when the authorization checkbox is unchecked", () => {
    const result = parseIssueForm(issueBody({ authorityChecked: false }));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Authorization checkbox"))).toBe(true);
  });

  it("accumulates every validation error, not just the first", () => {
    const result = parseIssueForm(issueBody({ feedUrl: "", companyName: "", authorityChecked: false }));
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("employer-intake — secret and candidate-data rejection (SP-16 criterion 2: secrets and candidate data are rejected)", () => {
  it("detects an API key pattern", () => {
    expect(containsSecretLikeContent("here is my api_key: sk_live_abc123")).not.toHaveLength(0);
  });
  it("detects a private key block", () => {
    expect(containsSecretLikeContent("-----BEGIN RSA PRIVATE KEY-----\nMIIB...")).not.toHaveLength(0);
  });
  it("detects a GitHub PAT", () => {
    expect(containsSecretLikeContent("token: ghp_" + "a".repeat(36))).not.toHaveLength(0);
  });
  it("detects an AWS access key id", () => {
    expect(containsSecretLikeContent("AKIA1234567890ABCDEF")).not.toHaveLength(0);
  });
  it("does not flag ordinary business prose", () => {
    expect(containsSecretLikeContent(issueBody())).toHaveLength(0);
  });

  it("detects candidate-data markers", () => {
    expect(containsCandidateDataMarkers("Please see attached my resume and curriculum vitae")).not.toHaveLength(0);
    expect(containsCandidateDataMarkers("date of birth: 1990-01-01")).not.toHaveLength(0);
  });
  it("does not flag ordinary business prose for candidate-data markers", () => {
    expect(containsCandidateDataMarkers(issueBody())).toHaveLength(0);
  });

  it("parseIssueForm rejects the whole submission when a secret is present anywhere in the body, not just parsed fields", () => {
    const body = issueBody() + "\n\nOh also here's our api_key: sk_live_do_not_share_12345\n";
    const result = parseIssueForm(body);
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors[0]).toContain("secret-like");
  });

  it("parseIssueForm rejects the whole submission when candidate-data markers are present", () => {
    const body = issueBody() + "\n\nAlso attached my resume and passport number for verification.\n";
    const result = parseIssueForm(body);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("candidate-personal-data-like");
  });
});

describe("employer-intake — candidate row builder (never publishes, always needs_review/candidate)", () => {
  const parsed = parseIssueForm(issueBody());
  if (!parsed.ok || !parsed.data) throw new Error("fixture must parse");

  it("builds a candidate row keyed by exact host, needs_review/candidate, 14-day deadline", () => {
    const row = buildEmployerCandidateRow({
      intake: parsed.data!,
      issueNumber: 42,
      issueUrl: "https://github.com/cyalcala/va-freelance-hub/issues/42",
      nowIso: "2026-08-29T12:00:00.000Z",
    });
    expect(row.sourceId).toBe("employer:careers.acme-corp.com");
    expect(row.providerId).toBe(EMPLOYER_PROVIDER_ID);
    expect(row.complianceState).toBe("needs_review");
    expect(row.operationalState).toBe("candidate");
    expect(row.reviewDeadline).toBe("2026-09-12T12:00:00.000Z");
    expect(row.optOut).toBe(0);
    expect(row.endpointUrl).toBe("https://careers.acme-corp.com/jobs.xml");
  });

  it("provenance JSON records the issue number/url and submission fields, never a secret or raw issue body", () => {
    const row = buildEmployerCandidateRow({
      intake: parsed.data!,
      issueNumber: 7,
      issueUrl: "https://github.com/cyalcala/va-freelance-hub/issues/7",
      nowIso: "2026-08-29T12:00:00.000Z",
    });
    const provenance = JSON.parse(row.discoveryProvenance);
    expect(provenance.issueNumber).toBe(7);
    expect(provenance.companyName).toBe("Acme Corp");
    expect(provenance.contactEmail).toBe("hiring@acme-corp.com");
    expect(provenance.provenance).toBe("employer-submitted-intake");
  });

  it("employerSourceId is exact-host derived and stable for the same host", () => {
    expect(employerSourceId("https://careers.acme-corp.com/jobs.xml")).toBe("employer:careers.acme-corp.com");
    expect(employerSourceId("https://careers.acme-corp.com/other/path.json")).toBe("employer:careers.acme-corp.com");
    expect(employerSourceId("not a url")).toBeNull();
  });
});

describe("employer-intake — dedup against registry and opt-outs (SP-16 criterion 3)", () => {
  it("a brand-new host is 'new'", () => {
    const result = checkDuplicate("employer:new-co.example", new Set(["employer:other.example"]), new Set());
    expect(result.outcome).toBe("new");
  });

  it("an existing registry sourceId is 'duplicate'", () => {
    const result = checkDuplicate("employer:acme.example", new Set(["employer:acme.example"]), new Set());
    expect(result.outcome).toBe("duplicate");
  });

  it("an opted-out sourceId is 'opted_out' even if also somehow in the registry", () => {
    const result = checkDuplicate("employer:blocked.example", new Set(["employer:blocked.example"]), new Set(["employer:blocked.example"]));
    expect(result.outcome).toBe("opted_out");
  });
});
