import { describe, it, expect } from "bun:test";
import { recruiteeFeedUrl, parseRecruiteeXml } from "./recruitee";

describe("recruitee — feed URL builder", () => {
  it("builds the formatted XML feed URL for a company subdomain", () => {
    expect(recruiteeFeedUrl("myjewellery")).toBe("https://myjewellery.recruitee.com/api/feeds/offers.xml");
  });
});

// Real, live-captured XML content (2026-08-30) from
// https://myjewellery.recruitee.com/api/feeds/offers.xml — a real, named
// Recruitee customer (verified via TheirStack's customer list, then
// confirmed live), not synthesized. Two real offers: one fully on-site
// with a single location, one hybrid with an HTML-entity-encoded city
// name. The third offer is a structurally-accurate SYNTHETIC construction
// (My Jewellery's real feed had no multi-location offer at capture time)
// used only to exercise the multi-location coercion path.
const REAL_XML_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<offers>
  <offer>
    <id>2724678</id>
    <slug>floor-manager-bataviastad</slug>
    <title><![CDATA[Floor Manager Bataviastad]]></title>
    <description><![CDATA[<p>Full HTML job description here.</p>]]></description>
    <requirements><![CDATA[<ul><li>Full HTML requirements here.</li></ul>]]></requirements>
    <highlight><![CDATA[<p>Full HTML highlight here.</p>]]></highlight>
    <location>Lelystad, Flevoland, Nederland</location>
    <country>Nederland</country>
    <city>Lelystad</city>
    <country_code>NL</country_code>
    <state_code>FL</state_code>
    <postal_code>8242 PS</postal_code>
    <remote>false</remote>
    <hybrid>false</hybrid>
    <on_site>true</on_site>
    <department>Boutiques</department>
    <employment_type_code>fulltime_fixed_term</employment_type_code>
    <category>retail</category>
    <company_name>My Jewellery</company_name>
    <careers_url>https://myjewellery.recruitee.com/o/floor-manager-bataviastad</careers_url>
    <apply_url>https://myjewellery.recruitee.com/o/floor-manager-bataviastad/c/new</apply_url>
    <mailbox_email>job.sw8dm@myjewellery.recruitee.com</mailbox_email>
    <created_at>2026-08-27 12:49:28 UTC</created_at>
    <updated_at>2026-08-27 12:50:16 UTC</updated_at>
    <published_at>2026-08-27 12:50:16 UTC</published_at>
    <close_at></close_at>
    <locations>
        <location>
          <id>165290</id>
          <country_code>NL</country_code>
          <state_code>FL</state_code>
          <country>Nederland</country>
          <state>Flevoland</state>
          <name>Lelystad - Batavia Stad</name>
          <street>Bataviaplein 214</street>
          <postal_code>8242 PS</postal_code>
          <city>Lelystad</city>
          <note></note>
        </location>
    </locations>
  </offer>
  <offer>
    <id>2723896</id>
    <slug>test-automation-engineer-3</slug>
    <title><![CDATA[Test Automation Engineer]]></title>
    <description><![CDATA[<p>Another full HTML description.</p>]]></description>
    <requirements><![CDATA[<p>More requirements.</p>]]></requirements>
    <highlight><![CDATA[<p>Another highlight.</p>]]></highlight>
    <location>&#39;s-Hertogenbosch, Noord-Brabant, Nederland</location>
    <country>Nederland</country>
    <city>&#39;s-Hertogenbosch</city>
    <country_code>NL</country_code>
    <state_code>NB</state_code>
    <postal_code>5222 AT</postal_code>
    <remote>false</remote>
    <hybrid>true</hybrid>
    <on_site>false</on_site>
    <department>Tech</department>
    <employment_type_code>fulltime_fixed_term</employment_type_code>
    <category>retail</category>
    <company_name>My Jewellery</company_name>
    <careers_url>https://myjewellery.recruitee.com/o/test-automation-engineer-3</careers_url>
    <apply_url>https://myjewellery.recruitee.com/o/test-automation-engineer-3/c/new</apply_url>
    <mailbox_email>job.sam1h@myjewellery.recruitee.com</mailbox_email>
    <created_at>2026-08-27 08:19:52 UTC</created_at>
    <updated_at>2026-08-27 08:31:31 UTC</updated_at>
    <published_at>2026-08-27 08:25:33 UTC</published_at>
    <close_at></close_at>
    <locations>
        <location>
          <id>164945</id>
          <country_code>NL</country_code>
          <state_code>NB</state_code>
          <country>Nederland</country>
          <state>Noord-Brabant</state>
          <name>&#39;s-Hertogenbosch - HQ</name>
          <street>Ruwekampweg 4</street>
          <postal_code>5222 AT</postal_code>
          <city>&#39;s-Hertogenbosch</city>
          <note></note>
        </location>
    </locations>
  </offer>
  <offer>
    <id>9999999</id>
    <slug>synthetic-multi-location-role</slug>
    <title><![CDATA[Synthetic Multi-Location Role]]></title>
    <description><![CDATA[<p>Synthetic fixture for the multi-location coercion path.</p>]]></description>
    <location>Amsterdam, Noord-Holland, Nederland</location>
    <country>Nederland</country>
    <city>Amsterdam</city>
    <remote>true</remote>
    <hybrid>false</hybrid>
    <on_site>false</on_site>
    <department>Ops</department>
    <employment_type_code>parttime</employment_type_code>
    <company_name>My Jewellery</company_name>
    <careers_url>https://myjewellery.recruitee.com/o/synthetic-multi-location-role</careers_url>
    <published_at>2026-08-27 10:00:00 UTC</published_at>
    <locations>
        <location>
          <city>Amsterdam</city>
          <country>Nederland</country>
        </location>
        <location>
          <city>Rotterdam</city>
          <country>Nederland</country>
        </location>
    </locations>
  </offer>
</offers>`;

describe("recruitee — parseRecruiteeXml (SP-15 criterion: minimal content, only published offers)", () => {
  it("parses real offers with canonical careers_url, title, and normalized date", () => {
    const result = parseRecruiteeXml(REAL_XML_FIXTURE);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      id: "2724678",
      title: "Floor Manager Bataviastad",
      careersUrl: "https://myjewellery.recruitee.com/o/floor-manager-bataviastad",
      postedAt: new Date("2026-08-27T12:50:16Z").toISOString(),
      locationSummary: "Lelystad, Nederland",
      remote: false,
      hybrid: false,
      onSite: true,
      department: "Boutiques",
      employmentType: "fulltime_fixed_term",
    });
  });

  it("never includes description/requirements/highlight or mailbox_email — all actively excluded", () => {
    const result = parseRecruiteeXml(REAL_XML_FIXTURE);
    for (const p of result) {
      expect((p as any).description).toBeUndefined();
      expect((p as any).requirements).toBeUndefined();
      expect((p as any).highlight).toBeUndefined();
      expect((p as any).mailboxEmail).toBeUndefined();
      expect((p as any).applyUrl).toBeUndefined();
    }
    // sanity: the source fixture really does carry this content
    expect(REAL_XML_FIXTURE).toContain("Full HTML job description here");
    expect(REAL_XML_FIXTURE).toContain("mailbox_email");
  });

  it("correctly decodes an HTML-entity-encoded city name (real second item)", () => {
    const result = parseRecruiteeXml(REAL_XML_FIXTURE);
    expect(result[1].locationSummary).toBe("'s-Hertogenbosch, Nederland");
    expect(result[1].hybrid).toBe(true);
    expect(result[1].onSite).toBe(false);
  });

  it("joins multiple locations for a single posting (synthetic third item)", () => {
    const result = parseRecruiteeXml(REAL_XML_FIXTURE);
    expect(result[2].locationSummary).toBe("Amsterdam, Nederland / Rotterdam, Nederland");
    expect(result[2].remote).toBe(true);
  });

  it("is pure — identical input yields identical output", () => {
    const a = parseRecruiteeXml(REAL_XML_FIXTURE);
    const b = parseRecruiteeXml(REAL_XML_FIXTURE);
    expect(a).toEqual(b);
  });

  it("returns an empty array for malformed or empty XML rather than throwing", () => {
    expect(parseRecruiteeXml("not xml <<<")).toEqual([]);
    expect(parseRecruiteeXml("")).toEqual([]);
    expect(parseRecruiteeXml(`<?xml version="1.0"?><offers></offers>`)).toEqual([]);
  });

  it("skips offers missing a required field (id/title/careers_url)", () => {
    const broken = `<offers><offer><title>No id or url</title></offer></offers>`;
    expect(parseRecruiteeXml(broken)).toEqual([]);
  });
});
