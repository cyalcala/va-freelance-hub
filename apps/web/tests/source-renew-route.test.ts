import { expect, test } from "bun:test";
import { createSourceRenewHandler } from "../src/pages/api/cron/source-renew";
import { liveAdmissionFixture } from "../../../packages/scraper/test-fixtures/admission";

function ctx(value: unknown, authorized = true) {
  return { request: new Request("https://example.com/api/cron/source-renew", {
    method: "POST", headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: "Bearer test" } : {}) },
    body: JSON.stringify(value),
  }), locals: { runtime: { env: { PROXY_SECRET: "test", DB: {
    prepare: () => ({ bind: () => ({ all: async () => ({ success: true, results: [{ sourceId: "greenhouse:test" }] }) }) }),
    batch: () => { throw new Error("No unmocked writes allowed"); },
  } } } } } as any;
}

test("renewal authentication and allowlist reject before capture or writes", async () => {
  const handler = createSourceRenewHandler({ capture: async () => { throw new Error("must not capture"); } });
  expect((await handler(ctx({ providerId: "greenhouse", mode: "preview" }, false))).status).toBe(401);
  expect((await handler(ctx({ providerId: "arbitrary", mode: "renew" }))).status).toBe(400);
});

test("preview is read-only; reviewed hashes and revisions bind renewal", async () => {
  const fixture = await liveAdmissionFixture();
  let writes = 0;
  let probes = 0;
  let content = "Actual primary document";
  const handler = createSourceRenewHandler({
    load: (async () => ({ ok: true, source: { ...fixture.source, operationalState: "shadow" }, provider: fixture.provider,
      packet: fixture.packet, evidence: { id: 7 } })) as any,
    capture: async () => content,
    probe: (async () => { probes++; return fixture.packet.probe; }) as any,
    renew: async (_db, input) => {
      writes++;
      expect(input.captures[0].content).toBe(content);
      expect(input.adjudication.decision).toBe("renew_existing_scope");
      expect(input.probes).toHaveLength(1);
      return { ok: true, providerRevision: 2, evidenceIds: { [fixture.source.sourceId]: 8 } };
    },
  });
  const previewResponse = await handler(ctx({ providerId: "greenhouse", mode: "preview" }));
  expect(previewResponse.status).toBe(200);
  const preview = await previewResponse.json();
  expect(writes).toBe(0);
  expect(probes).toBe(0);
  expect((await handler(ctx({ ...preview, mode: "renew", expectedProviderRevision: 999 }))).status).toBe(409);
  expect(writes).toBe(0);
  content = "Changed document";
  expect((await handler(ctx({ ...preview, mode: "renew" }))).status).toBe(409);
  expect(probes).toBe(0);
  content = "Actual primary document";
  const renewed = await handler(ctx({ ...preview, mode: "renew" }));
  expect(renewed.status).toBe(200);
  expect(await renewed.json()).toMatchObject({ ok: true, published: 0, observationWindowRestarted: true });
  expect(writes).toBe(1);
});
