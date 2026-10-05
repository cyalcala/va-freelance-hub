import { expect, test } from "bun:test";
import { sanitizeApplyUrl, sanitizeApplyUrlForSource, sanitizeSourceUrl } from "./urls";

test("accepts normalized public http and https source URLs", () => {
  expect(sanitizeSourceUrl(" https://jobs.example.com/openings?id=42 "))
    .toBe("https://jobs.example.com/openings?id=42");
  expect(sanitizeSourceUrl("http://example.com/job")).toBe("http://example.com/job");
});

test("rejects non-web, credential-bearing, and local source URLs", () => {
  expect(sanitizeSourceUrl("javascript:alert(1)")).toBeNull();
  expect(sanitizeSourceUrl("data:text/html,boom")).toBeNull();
  expect(sanitizeSourceUrl("https://user:pass@example.com/job")).toBeNull();
  expect(sanitizeSourceUrl("https://localhost/job")).toBeNull();
  expect(sanitizeSourceUrl("https://127.0.0.1/job")).toBeNull();
});

// An apply URL is stored and rendered as the public "Apply" link, so it inherits
// the same two rules the source gate already enforces: no embedded credentials
// and no local, loopback or IP-literal host. Without them the gate admitted
// `https://recruiter@boards.greenhouse.io/...` — a userinfo segment on an
// otherwise approved ATS tenant — and link-local metadata targets.
test("rejects credential-bearing apply URLs that still match an approved ATS tenant", () => {
  expect(sanitizeApplyUrlForSource(
    "https://recruiter@boards.greenhouse.io/acme/jobs/1",
    "https://boards.greenhouse.io/acme",
  )).toBeNull();
  expect(sanitizeApplyUrlForSource(
    "https://recruiter:hunter2@boards.greenhouse.io/acme/jobs/1",
    "https://boards.greenhouse.io/acme",
  )).toBeNull();
  expect(sanitizeApplyUrlForSource(
    "https://jobs.lever.co/acme/1?user=recruiter",
    "https://jobs.lever.co/acme",
  )).toBe("https://jobs.lever.co/acme/1?user=recruiter");
});

test("rejects credential-bearing apply URLs regardless of tenant or host shape", () => {
  expect(sanitizeApplyUrl("http://user:pw@jobs.example.com/apply")).toBeNull();
  expect(sanitizeApplyUrl("https://recruiter@jobs.example.com/apply")).toBeNull();
  expect(sanitizeApplyUrl("https://user:pw@jobs.example.com/apply")).toBeNull();
  expect(sanitizeApplyUrl("https://user%40evil.example:pw@jobs.example.com/a")).toBeNull();
});

test("rejects local, loopback and IP-literal apply hosts", () => {
  expect(sanitizeApplyUrl("http://127.0.0.1/x")).toBeNull();
  expect(sanitizeApplyUrl("http://192.168.1.1/admin")).toBeNull();
  expect(sanitizeApplyUrl("http://169.254.169.254/latest/meta-data/")).toBeNull();
  expect(sanitizeApplyUrl("http://localhost:8787/x")).toBeNull();
  expect(sanitizeApplyUrl("http://svc.internal.localhost/x")).toBeNull();
  expect(sanitizeApplyUrl("http://[::1]/x")).toBeNull();
  expect(sanitizeApplyUrlForSource(
    "http://169.254.169.254/latest/meta-data/",
    "https://boards.greenhouse.io/acme",
  )).toBeNull();
});

test("keeps the credential-free apply URLs the public surface depends on", () => {
  expect(sanitizeApplyUrl("https://boards.greenhouse.io/acme/jobs/1")).toBe(
    "https://boards.greenhouse.io/acme/jobs/1",
  );
  expect(sanitizeApplyUrl("https://jobs.example.com/apply?id=1")).toBe(
    "https://jobs.example.com/apply?id=1",
  );
  expect(sanitizeApplyUrl("hr@acme.co")).toBe("mailto:hr@acme.co");
  expect(sanitizeApplyUrl("mailto:hr@acme.co")).toBe("mailto:hr@acme.co");
  expect(sanitizeApplyUrlForSource(
    "https://boards.greenhouse.io/acme/jobs/1",
    "https://boards.greenhouse.io/acme",
  )).toBe("https://boards.greenhouse.io/acme/jobs/1");
  // A subdomain of an IP-literal shape is still a normal name, not a literal.
  expect(sanitizeApplyUrl("http://jobs.1.2.3.example.com/x")).toBe(
    "http://jobs.1.2.3.example.com/x",
  );
});
