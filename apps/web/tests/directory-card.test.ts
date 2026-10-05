import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  directoryLogoDomain,
  normalizeDirectoryUrl,
  toDirectoryCard,
} from "../src/lib/directory-card";
import type { DirectoryAgency } from "../src/lib/directory-page";

function agency(overrides: Partial<DirectoryAgency> = {}): DirectoryAgency {
  return {
    id: 42,
    companyName: "Acme Virtual",
    website: null,
    niche: "global-va",
    isDayshift: false,
    isVerified: true,
    isRemote: true,
    isMarketplace: false,
    ...overrides,
  };
}

const realWarn = console.warn;
let warnings: unknown[][] = [];

beforeEach(() => {
  warnings = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
});

afterEach(() => {
  console.warn = realWarn;
});

test("normalizeDirectoryUrl keeps an already-normalized public https URL", () => {
  expect(normalizeDirectoryUrl("https://acme.example/careers")).toBe(
    "https://acme.example/careers",
  );
});

test("normalizeDirectoryUrl upgrades a bare hostname to https", () => {
  expect(normalizeDirectoryUrl("acme.example")).toBe("https://acme.example/");
});

test("normalizeDirectoryUrl upgrades a protocol-relative hostname to https", () => {
  expect(normalizeDirectoryUrl("//acme.example")).toBe("https://acme.example/");
});

test("normalizeDirectoryUrl returns null for a missing website", () => {
  expect(normalizeDirectoryUrl(null)).toBeNull();
  expect(normalizeDirectoryUrl("")).toBeNull();
  expect(normalizeDirectoryUrl("   ")).toBeNull();
});

test("normalizeDirectoryUrl rejects the shapes sanitizeSourceUrl refuses, and the https retry cannot rescue", () => {
  // The second sanitizeSourceUrl call prefixes https://, so a local host, an IP
  // literal or embedded credentials must still fail after the upgrade.
  expect(normalizeDirectoryUrl("http://localhost/")).toBeNull();
  expect(normalizeDirectoryUrl("http://127.0.0.1:8787/")).toBeNull();
  expect(normalizeDirectoryUrl("http://169.254.169.254/latest/meta-data/")).toBeNull();
  expect(normalizeDirectoryUrl("http://user:pass@acme.example/x")).toBeNull();
  expect(normalizeDirectoryUrl("javascript:alert(1)")).toBeNull();
});

test("directoryLogoDomain returns the hostname of a parseable href", () => {
  expect(directoryLogoDomain("https://acme.example/careers")).toBe("acme.example");
  expect(directoryLogoDomain("https://www.acme.example:8443/careers?x=1")).toBe(
    "www.acme.example",
  );
});

test("directoryLogoDomain returns null when there is no href at all", () => {
  expect(directoryLogoDomain(null)).toBeNull();
});

test("directoryLogoDomain fails closed instead of throwing on an unparseable href", () => {
  // sanitizeSourceUrl only ever returns the string form of a successfully parsed
  // URL, so today's producer cannot reach this branch. It stays tested anyway: a
  // future writer that hand-assembles hrefs must degrade to "no logo host", never
  // to a 500 on the public directory page.
  expect(directoryLogoDomain("https://")).toBeNull();
  expect(directoryLogoDomain("acme.example/careers")).toBeNull();
});

test("toDirectoryCard links a safe agency and derives its logo host without warning", () => {
  const card = toDirectoryCard(agency({ website: "acme.example" }), normalizeDirectoryUrl("acme.example"));

  expect(card.href).toBe("https://acme.example/");
  expect(card.logoDomain).toBe("acme.example");
  expect(card.companyName).toBe("Acme Virtual");
  expect(warnings).toHaveLength(0);
});

test("toDirectoryCard renders an agency without a website as unlinked and silent", () => {
  const card = toDirectoryCard(agency({ website: null }), normalizeDirectoryUrl(null));

  expect(card.href).toBeNull();
  expect(card.logoDomain).toBeNull();
  expect(warnings).toHaveLength(0);
});

test("toDirectoryCard keeps a rejected website unlinked rather than surfacing it", () => {
  const card = toDirectoryCard(
    agency({ website: "http://127.0.0.1:8787/" }),
    normalizeDirectoryUrl("http://127.0.0.1:8787/"),
  );

  expect(card.href).toBeNull();
  expect(card.logoDomain).toBeNull();
  expect(warnings).toHaveLength(0);
});

test("toDirectoryCard degrades to no logo host but reports it, so the loss is never silent", () => {
  const card = toDirectoryCard(
    agency({ id: 7, companyName: "Acme Virtual", website: "acme.example" }),
    "acme.example/careers",
  );

  expect(card.href).toBe("acme.example/careers");
  expect(card.logoDomain).toBeNull();
  expect(warnings).toHaveLength(1);
  expect(String(warnings[0][0])).toContain("Acme Virtual");
  expect(String(warnings[0][0])).toContain("7");
});

test("toDirectoryCard never logs the raw website value, which may be untrusted", () => {
  // Unparseable (the embedded space), and carrying credential-shaped and
  // query-shaped text that must never reach a log line.
  const hostile = "http://user:pa$$w0rd@169.254.169.254 token=abc123";
  toDirectoryCard(agency({ website: hostile }), hostile);

  expect(warnings).toHaveLength(1);
  const logged = String(warnings[0][0]);
  expect(logged).not.toContain("pa$$w0rd");
  expect(logged).not.toContain("token=abc123");
});