import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { fetchBreezy } from "./ats";
import { geoGate } from "./geoGate";

describe("fetchBreezy — onsite vs remote parsing and geoGate pipeline", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("marks is_remote: false jobs as locationType: 'onsite' with (onsite) in locationRaw", async () => {
    globalThis.fetch = (async (url: string) => {
      return new Response(
        JSON.stringify([
          {
            id: "breezy-1",
            name: "National Material Quantity Surveyor",
            url: "https://sourcefit.breezy.hr/p/breezy-1",
            salary: "PHP 50,000 - 70,000",
            published_date: "2026-09-24T00:00:00.000Z",
            locations: [
              {
                name: "Bridgetowne Quezon City, PH",
                is_remote: false,
              },
            ],
          },
        ]),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as any;

    const items = await fetchBreezy("sourcefit", "Sourcefit");
    expect(items.length).toBe(1);
    const item = items[0];

    expect(item.title).toBe("National Material Quantity Surveyor");
    expect(item.locationType).toBe("onsite");
    expect(item.locationRaw).toBe("Bridgetowne Quezon City, PH (onsite)");
    expect(item.description).toBe("Location: Bridgetowne Quezon City, PH. Remote: no.");

    // Passed to geoGate: must be rejected as ineligible
    const verdict = geoGate({
      title: item.title,
      locationRaw: item.locationRaw,
      description: item.description,
    });
    expect(verdict.phEligibility).toBe("ineligible");
    expect(verdict.evidence).toContain("Not fully remote");
  });

  it("marks is_remote: true jobs as locationType: 'remote' with clean locationRaw", async () => {
    globalThis.fetch = (async (url: string) => {
      return new Response(
        JSON.stringify([
          {
            id: "breezy-2",
            name: "Systems Administrator",
            url: "https://sourcefit.breezy.hr/p/breezy-2",
            salary: "PHP 80,000",
            published_date: "2026-09-24T00:00:00.000Z",
            locations: [
              {
                name: "Eastwood Quezon City, PH",
                is_remote: true,
              },
            ],
          },
          {
            id: "breezy-3",
            name: "Digital Marketing Virtual Assistant",
            url: "https://20four7va.breezy.hr/p/breezy-3",
            salary: "$5 - $8 / hour",
            published_date: "2026-09-24T00:00:00.000Z",
            locations: [
              {
                name: "Worldwide",
                is_remote: true,
              },
            ],
          },
        ]),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as any;

    const items = await fetchBreezy("mixed", "Agency");
    expect(items.length).toBe(2);

    // Job 1: Remote PH
    const phRemote = items[0];
    expect(phRemote.locationType).toBe("remote");
    expect(phRemote.locationRaw).toBe("Eastwood Quezon City, PH");
    expect(phRemote.description).toBe("Location: Eastwood Quezon City, PH. Remote: yes.");

    const phVerdict = geoGate({
      title: phRemote.title,
      locationRaw: phRemote.locationRaw,
      description: phRemote.description,
    });
    expect(phVerdict.phEligibility).toBe("eligible_verified");
    expect(phVerdict.geoScope).toBe("ph_only");

    // Job 2: Remote Worldwide VA
    const vaRemote = items[1];
    expect(vaRemote.locationType).toBe("remote");
    expect(vaRemote.locationRaw).toBe("Worldwide");
    expect(vaRemote.description).toBe("Location: Worldwide. Remote: yes.");

    const vaVerdict = geoGate({
      title: vaRemote.title,
      locationRaw: vaRemote.locationRaw,
      description: vaRemote.description,
    });
    expect(vaVerdict.phEligibility).toBe("eligible_likely");
    expect(vaVerdict.geoScope).toBe("worldwide");
  });
});
