import { describe, expect, test } from "bun:test";
import {
  buildAtsCareerUrl,
  extractDomainFromUrl,
  enrichDirectory,
  type EnrichmentTarget,
} from "../src/lib/directory-enrich";

describe("buildAtsCareerUrl", () => {
  test("maps each known ATS platform to its career board URL", () => {
    expect(buildAtsCareerUrl("greenhouse", "gitlab")).toBe("https://boards.greenhouse.io/gitlab");
    expect(buildAtsCareerUrl("lever", "vaultoutsourcing")).toBe("https://jobs.lever.co/vaultoutsourcing");
    expect(buildAtsCareerUrl("ashby", "supabase")).toBe("https://jobs.ashbyhq.com/supabase");
    expect(buildAtsCareerUrl("breezy", "20four7va")).toBe("https://20four7va.breezy.hr");
    expect(buildAtsCareerUrl("workable", "rocketams")).toBe("https://apply.workable.com/rocketams");
  });

  test("returns null for an unknown platform", () => {
    expect(buildAtsCareerUrl("greenhouse-io", "gitlab")).toBeNull();
  });

  test("returns null when platform or token is missing", () => {
    expect(buildAtsCareerUrl(null, "gitlab")).toBeNull();
    expect(buildAtsCareerUrl("greenhouse", null)).toBeNull();
    expect(buildAtsCareerUrl(null, null)).toBeNull();
  });
});

describe("extractDomainFromUrl", () => {
  test("strips leading www and returns the https origin for a real company host", () => {
    expect(extractDomainFromUrl("https://www.taskus.com/careers")).toBe("https://taskus.com");
    expect(extractDomainFromUrl("https://cloudstaff.com/any/path")).toBe("https://cloudstaff.com");
  });

  test("returns null for ATS board hosts (never set an ATS board as a company website)", () => {
    expect(extractDomainFromUrl("https://boards.greenhouse.io/gitlab")).toBeNull();
    expect(extractDomainFromUrl("https://jobs.lever.co/vaultoutsourcing")).toBeNull();
    expect(extractDomainFromUrl("https://jobs.ashbyhq.com/supabase")).toBeNull();
    expect(extractDomainFromUrl("https://apply.workable.com/rocketams")).toBeNull();
    expect(extractDomainFromUrl("https://20four7va.breezy.hr")).toBeNull();
  });

  test("returns null for remote-job aggregator hosts", () => {
    expect(extractDomainFromUrl("https://weworkremotely.com/job/foo")).toBeNull();
    expect(extractDomainFromUrl("https://remoteok.com/api")).toBeNull();
    expect(extractDomainFromUrl("https://remotive.com/remote-jobs")).toBeNull();
    expect(extractDomainFromUrl("https://realworkfromanywhere.com/feed")).toBeNull();
    expect(extractDomainFromUrl("https://jobicy.com/supporting")).toBeNull();
  });

  test("returns null for third-party job boards (LinkedIn/Indeed/Glassdoor/ZipRecruiter/SmartRecruiters)", () => {
    expect(extractDomainFromUrl("https://linkedin.com/jobs/view/123")).toBeNull();
    expect(extractDomainFromUrl("https://www.linkedin.com/jobs/view/123")).toBeNull();
    expect(extractDomainFromUrl("https://indeed.com/viewjob?jk=abc")).toBeNull();
    expect(extractDomainFromUrl("https://www.glassdoor.com/job.htm?id=1")).toBeNull();
    expect(extractDomainFromUrl("https://ziprecruiter.com/job/123")).toBeNull();
    expect(extractDomainFromUrl("https://jobs.smartrecruiters.com/acme")).toBeNull();
  });

  test("returns null for null/empty/invalid URLs", () => {
    expect(extractDomainFromUrl(null)).toBeNull();
    expect(extractDomainFromUrl("")).toBeNull();
    expect(extractDomainFromUrl("not a url")).toBeNull();
  });
});

/**
 * Minimal drizzle-shaped fake supporting exactly the chains enrichDirectory uses:
 *   select().from().where().orderBy().limit()  -> queued target rows
 *   all(sql)                                  -> queued raw-SQL result rows
 *   update().set().where()                    -> recorded
 *
 * `allResults` is a queue consumed in call order. Queue an Error instance to
 * make the next `db.all` reject (used to prove the P1-2 wedge guard).
 */
function makeFakeDb(targets: EnrichmentTarget[], allResults: Array<unknown[] | Error>) {
  const allQueue = [...allResults];
  const updates: Array<Record<string, unknown>> = [];

  const db: any = {
    select() {
      const builder: any = {
        from: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: () => Promise.resolve(targets),
      };
      return builder;
    },
    all() {
      const next = allQueue.shift();
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next ?? []);
    },
    update() {
      return {
        set: (vals: Record<string, unknown>) => ({
          where: () => {
            updates.push(vals);
            return Promise.resolve();
          },
        }),
      };
    },
  };
  return { db, updates };
}

describe("enrichDirectory", () => {
  test("P1-1 regression: an existing hiringPageUrl is never overwritten", async () => {
    // Company already has a hiringPageUrl in the DB but is missing its website.
    // The old code re-set hiringPageUrl from the ATS token inside the
    // needsWebsite branch, overwriting the existing value and under-counting.
    const target: EnrichmentTarget = {
      id: 1,
      companyName: "Co",
      website: null,
      hiringPageUrl: "https://existing.careers.com",
      atsPlatform: "greenhouse",
      atsToken: "co",
      isVerified: true,
    };
    const { db, updates } = makeFakeDb([target], [
      [{ appUrl: "https://co.com/careers", srcUrl: null }],
    ]);

    const result = await enrichDirectory(db, 40);

    expect(result.hiringPageSet).toBe(0);
    expect(result.websiteSet).toBe(1);
    expect(result.enriched).toBe(1);
    expect(updates.length).toBe(1);
    expect(updates[0].hiringPageUrl).toBeUndefined();
    expect(updates[0].website).toBe("https://co.com");
  });

  test("sets hiringPageUrl from the ATS token when it is missing", async () => {
    const target: EnrichmentTarget = {
      id: 2,
      companyName: "Co2",
      website: "https://co2.com",
      hiringPageUrl: null,
      atsPlatform: "greenhouse",
      atsToken: "co2",
      isVerified: true,
    };
    // No db.all calls expected: needsWebsite=false, needsVerification=false.
    const { db, updates } = makeFakeDb([target], []);

    const result = await enrichDirectory(db, 40);

    expect(result.hiringPageSet).toBe(1);
    expect(result.enriched).toBe(1);
    expect(updates[0].hiringPageUrl).toBe("https://boards.greenhouse.io/co2");
  });

  test("website inference prefers application_url over source_url", async () => {
    const target: EnrichmentTarget = {
      id: 3,
      companyName: "Co3",
      website: null,
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: true,
    };
    // appUrl is a real company domain; srcUrl is an aggregator we must ignore.
    const { db, updates } = makeFakeDb([target], [
      [{ appUrl: "https://realcompany.com/job/1", srcUrl: "https://weworkremotely.com/feed" }],
    ]);

    const result = await enrichDirectory(db, 40);

    expect(result.websiteSet).toBe(1);
    expect(updates[0].website).toBe("https://realcompany.com");
  });

  test("auto-verifies a company with >=1 verified and >=2 PH-eligible active jobs", async () => {
    const target: EnrichmentTarget = {
      id: 4,
      companyName: "Co4",
      website: "https://co4.com",
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: false,
    };
    const { db, updates } = makeFakeDb([target], [
      [{ verified_jobs: 2, total_ph_jobs: 5 }],
    ]);

    const result = await enrichDirectory(db, 40);

    expect(result.verified).toBe(1);
    expect(updates[0].isVerified).toBe(true);
    expect(updates[0].verifiedAt).toBeTruthy();
  });

  test("does not auto-verify when the PH-eligible job count is below the threshold", async () => {
    const target: EnrichmentTarget = {
      id: 5,
      companyName: "Co5",
      website: "https://co5.com",
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: false,
    };
    const { db, updates } = makeFakeDb([target], [
      [{ verified_jobs: 1, total_ph_jobs: 1 }],
    ]);

    const result = await enrichDirectory(db, 40);

    expect(result.verified).toBe(0);
    expect(result.enriched).toBe(0);
    expect(updates.length).toBe(0);
  });

  test("produces no update when the company already has everything", async () => {
    const target: EnrichmentTarget = {
      id: 6,
      companyName: "Co6",
      website: "https://co6.com",
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: true,
    };
    const { db, updates } = makeFakeDb([target], []);

    const result = await enrichDirectory(db, 40);

    expect(result.enriched).toBe(0);
    expect(updates.length).toBe(0);
  });

  test("P1-2 regression: a throwing target does not abort the rest of the run", async () => {
    // First target's db.all rejects (transient D1 error / poison row). The old
    // code would have aborted the whole run; the fixed code records the error
    // and continues to the next target.
    const targetA: EnrichmentTarget = {
      id: 10,
      companyName: "PoisonCo",
      website: null,
      hiringPageUrl: "https://h.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: true,
    };
    const targetB: EnrichmentTarget = {
      id: 11,
      companyName: "GoodCo",
      website: null,
      hiringPageUrl: "https://h2.com",
      atsPlatform: null,
      atsToken: null,
      isVerified: true,
    };
    const { db, updates } = makeFakeDb([targetA, targetB], [
      new Error("D1 read rejected"),
      [{ appUrl: "https://goodco.com/job", srcUrl: null }],
    ]);

    const result = await enrichDirectory(db, 40);

    expect(result.errors).toBe(1);
    expect(result.enriched).toBe(1);
    expect(result.websiteSet).toBe(1);
    expect(updates.length).toBe(1);
    expect(updates[0].website).toBe("https://goodco.com");
    expect(result.details.some((d) => d.id === 10 && d.action.startsWith("error:"))).toBe(true);
    expect(result.details.some((d) => d.id === 11 && d.action.startsWith("website="))).toBe(true);
  });
});
