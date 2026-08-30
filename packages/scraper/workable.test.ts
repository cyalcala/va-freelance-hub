import { describe, it, expect } from "bun:test";
import { parseWorkableXml, filterPlausibleCandidates, summarizeFilterStats, summarizeLocation, WORKABLE_FEED_URL } from "./workable";

// Real, live-captured <job> blocks (2026-08-30) from
// https://www.workable.com/boards/workable.xml — four real postings
// covering every combination of remote/country relevant to the
// remote-OR-PH coarse filter, not synthesized:
//  - REMOTE_NON_PH: remote=true, country=PT (Portugal)
//  - PH_NON_REMOTE: remote=false, country=PH (Taguig, Metro Manila)
//  - PLAIN: remote=false, country=IN (neither remote nor PH)
//  - REMOTE_AND_PH: remote=true, country=PH (the intersection case)
const REMOTE_NON_PH = `
    <title>
      <![CDATA[Medical Writer (CER)]]>
    </title>
    <date>
      <![CDATA[Wed, 28 Jul 2021 10:54:12 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[0F5C12DDE3]]>
    </referencenumber>
    <url>
      <![CDATA[https://apply.workable.com/j/0F5C12DDE3]]>
    </url>
    <company>
      <![CDATA[Cross Border Talents]]>
    </company>
    <city>
      <![CDATA[Lisbon]]>
    </city>
    <state>
      <![CDATA[Lisbon]]>
    </state>
    <country>
      <![CDATA[PT]]>
    </country>
    <remote>
      <![CDATA[true]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[<p><strong>Full HTML description here, must never survive normalization.</strong></p>]]>
    </description>
    <education>
      <![CDATA[]]>
    </education>
    <jobtype>
      <![CDATA[]]>
    </jobtype>
    <category>
      <![CDATA[]]>
    </category>
    <experience>
      <![CDATA[]]>
    </experience>
    <website>
      <![CDATA[http://cbtalents.com/]]>
    </website>
  `;

const PH_NON_REMOTE = `
    <title>
      <![CDATA[Software Engineer]]>
    </title>
    <date>
      <![CDATA[Wed, 28 Jul 2021 11:44:59 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[AE699F20DA]]>
    </referencenumber>
    <url>
      <![CDATA[https://apply.workable.com/j/AE699F20DA]]>
    </url>
    <company>
      <![CDATA[Freelancer.com]]>
    </company>
    <city>
      <![CDATA[Taguig]]>
    </city>
    <state>
      <![CDATA[Metro Manila]]>
    </state>
    <country>
      <![CDATA[PH]]>
    </country>
    <remote>
      <![CDATA[false]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[<h3>Full HTML description, must never survive normalization.</h3>]]>
    </description>
    <education>
      <![CDATA[Bachelor's Degree]]>
    </education>
    <jobtype>
      <![CDATA[Full-time]]>
    </jobtype>
    <category>
      <![CDATA[Engineering]]>
    </category>
    <experience>
      <![CDATA[Mid-Senior level]]>
    </experience>
    <website>
      <![CDATA[https://www.freelancer.com/careers]]>
    </website>
  `;

const PLAIN = `
    <title>
      <![CDATA[System Engineer]]>
    </title>
    <date>
      <![CDATA[Wed, 28 Jul 2021 10:24:17 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[F44ED9E40A]]>
    </referencenumber>
    <url>
      <![CDATA[https://apply.workable.com/j/F44ED9E40A]]>
    </url>
    <company>
      <![CDATA[Tech Firefly]]>
    </company>
    <city>
      <![CDATA[Hyderabad]]>
    </city>
    <state>
      <![CDATA[Telangana]]>
    </state>
    <country>
      <![CDATA[IN]]>
    </country>
    <remote>
      <![CDATA[false]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[<p>Full HTML description, must never survive normalization.</p>]]>
    </description>
    <education>
      <![CDATA[Bachelor's Degree]]>
    </education>
    <jobtype>
      <![CDATA[Contract]]>
    </jobtype>
    <category>
      <![CDATA[Information Technology]]>
    </category>
    <experience>
      <![CDATA[Mid-Senior level]]>
    </experience>
    <website>
      <![CDATA[https://techfirefly.com]]>
    </website>
  `;

const REMOTE_AND_PH = `
    <title>
      <![CDATA[Thai Content Reviewer]]>
    </title>
    <date>
      <![CDATA[Thu, 11 Aug 2022 09:05:56 UTC]]>
    </date>
    <referencenumber>
      <![CDATA[8FD6351FFA]]>
    </referencenumber>
    <url>
      <![CDATA[https://apply.workable.com/j/8FD6351FFA]]>
    </url>
    <company>
      <![CDATA[Tech Firefly]]>
    </company>
    <city>
      <![CDATA[]]>
    </city>
    <state>
      <![CDATA[Metro Manila]]>
    </state>
    <country>
      <![CDATA[PH]]>
    </country>
    <remote>
      <![CDATA[true]]>
    </remote>
    <postalcode>
      <![CDATA[]]>
    </postalcode>
    <description>
      <![CDATA[<p>Full HTML description, must never survive normalization.</p>]]>
    </description>
    <education>
      <![CDATA[Unspecified]]>
    </education>
    <jobtype>
      <![CDATA[Full-time]]>
    </jobtype>
    <category>
      <![CDATA[]]>
    </category>
    <experience>
      <![CDATA[]]>
    </experience>
    <website>
      <![CDATA[https://techfirefly.com]]>
    </website>
  `;

const FEED = `<?xml version="1.0" encoding="UTF-8"?><source>${[REMOTE_NON_PH, PH_NON_REMOTE, PLAIN, REMOTE_AND_PH].map((j) => `<job>${j}</job>`).join("")}</source>`;

describe("workable — parseWorkableXml (SP-10 criterion: minimal content, canonical URL)", () => {
  it("normalizes all four real postings with canonical url and correct fields", () => {
    const result = parseWorkableXml(FEED);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      referenceNumber: "0F5C12DDE3",
      title: "Medical Writer (CER)",
      url: "https://apply.workable.com/j/0F5C12DDE3",
      company: "Cross Border Talents",
      city: "Lisbon",
      state: "Lisbon",
      country: "PT",
      remote: true,
      jobType: null,
      category: null,
      postedAt: "Wed, 28 Jul 2021 10:54:12 UTC",
    });
  });

  it("never includes description (full HTML) — actively excluded", () => {
    const result = parseWorkableXml(FEED);
    for (const p of result) {
      expect((p as any).description).toBeUndefined();
    }
    // sanity: the source fixture really does carry full HTML content
    expect(FEED).toContain("must never survive normalization");
  });

  it("correctly reads the PH+non-remote and remote+PH real postings", () => {
    const result = parseWorkableXml(FEED);
    const phEngineer = result.find((p) => p.referenceNumber === "AE699F20DA")!;
    expect(phEngineer.country).toBe("PH");
    expect(phEngineer.remote).toBe(false);
    expect(phEngineer.jobType).toBe("Full-time");

    const remotePh = result.find((p) => p.referenceNumber === "8FD6351FFA")!;
    expect(remotePh.country).toBe("PH");
    expect(remotePh.remote).toBe(true);
    expect(remotePh.city).toBeNull();
  });

  it("is pure — identical input yields identical output", () => {
    expect(parseWorkableXml(FEED)).toEqual(parseWorkableXml(FEED));
  });

  it("returns an empty array for malformed or empty XML rather than throwing", () => {
    expect(parseWorkableXml("not xml <<<")).toEqual([]);
    expect(parseWorkableXml("")).toEqual([]);
    expect(parseWorkableXml(`<?xml version="1.0"?><source></source>`)).toEqual([]);
  });

  it("skips a job block missing a required field", () => {
    const broken = `<source><job><title><![CDATA[No refnum or url]]></title></job></source>`;
    expect(parseWorkableXml(broken)).toEqual([]);
  });
});

describe("workable — filterPlausibleCandidates (SP-10's actual preprocessing step)", () => {
  it("keeps remote=true OR country=PH, drops the plain (neither) posting", () => {
    const all = parseWorkableXml(FEED);
    const plausible = filterPlausibleCandidates(all);
    expect(plausible.map((p) => p.referenceNumber).sort()).toEqual(["0F5C12DDE3", "8FD6351FFA", "AE699F20DA"].sort());
    expect(plausible.find((p) => p.referenceNumber === "F44ED9E40A")).toBeUndefined();
  });

  it("keeps the remote+PH intersection posting exactly once (no duplication)", () => {
    const all = parseWorkableXml(FEED);
    const plausible = filterPlausibleCandidates(all);
    expect(plausible.filter((p) => p.referenceNumber === "8FD6351FFA")).toHaveLength(1);
  });

  it("is a strict subset — never invents or reorders postings", () => {
    const all = parseWorkableXml(FEED);
    const plausible = filterPlausibleCandidates(all);
    for (const p of plausible) expect(all).toContainEqual(p);
  });
});

describe("workable — summarizeFilterStats", () => {
  it("computes total/plausible/reduction correctly", () => {
    const all = parseWorkableXml(FEED);
    const plausible = filterPlausibleCandidates(all);
    const stats = summarizeFilterStats(all, plausible);
    expect(stats).toEqual({ totalParsed: 4, plausibleCandidates: 3, reductionPercent: 25 });
  });

  it("handles zero total without dividing by zero", () => {
    expect(summarizeFilterStats([], [])).toEqual({ totalParsed: 0, plausibleCandidates: 0, reductionPercent: 0 });
  });
});

describe("workable — summarizeLocation", () => {
  it("joins city and state when both present", () => {
    expect(summarizeLocation("Lisbon", "Lisbon")).toBe("Lisbon, Lisbon");
  });
  it("falls back to whichever field is present", () => {
    expect(summarizeLocation(null, "Metro Manila")).toBe("Metro Manila");
    expect(summarizeLocation("Hyderabad", null)).toBe("Hyderabad");
  });
  it("returns null when both are absent", () => {
    expect(summarizeLocation(null, null)).toBeNull();
  });
});

describe("workable — feed URL constant", () => {
  it("matches the SP-09-documented official feed URL", () => {
    expect(WORKABLE_FEED_URL).toBe("https://www.workable.com/boards/workable.xml");
  });
});
