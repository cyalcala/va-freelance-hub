import { describe, it, expect } from "bun:test";
import { geoGate, detectDominantLanguage } from "./geoGate";

// Golden set for the deterministic geo-gate. Fixture #1 is the real
// production escape that motivated the whole geo masterplan (job #4667).

describe("geoGate — golden fixtures", () => {
  it("#1 Casino Lugano (real escape): Italian posting via RemoteOK → ineligible", () => {
    const v = geoGate({
      title: "Addetto a Customer Service",
      description:
        "Per il nostro reparto online stiamo cercando la seguente figura: Addetto/-a Customer Service (100%) Mansioni: Occuparsi di assicurare la soddisfazione del cliente durante lo svolgimento di tutte le attività di gioco, gestione delle richieste dei clienti tramite live chat ed email, collaborazione con il team per garantire un servizio di qualità.",
      locationRaw: null,
      tags: ["remote", "global", "digital-nomad", "customer-service", "italian", "german"],
    });
    expect(v.phEligibility).toBe("ineligible");
    expect(v.evidence).toContain("it");
  });

  it("#2 RemoteOK-style location pin: Florida, United States → ineligible", () => {
    const v = geoGate({
      title: "Customer Support Specialist",
      description: "Join our fully distributed support team helping customers succeed.",
      locationRaw: "Florida, Florida, United States",
      tags: ["customer-service"],
    });
    expect(v.phEligibility).toBe("ineligible");
    expect(v.geoScope).toBe("country_locked");
    expect(v.evidence.toLowerCase()).toContain("florida");
  });

  it("#3 WWR region: Anywhere in the World → worldwide, eligible", () => {
    const v = geoGate({
      title: "Virtual Assistant",
      description: "Support our leadership team with scheduling and inbox management.",
      locationRaw: "Anywhere in the World",
      tags: ["admin"],
    });
    expect(v.geoScope).toBe("worldwide");
    expect(v.phEligibility).toBe("eligible_likely");
  });

  it("#4 Philippines-exclusive hiring → ph_only, eligible_verified", () => {
    const v = geoGate({
      title: "Customer Service Representative",
      description: "We are hiring for our Philippines team. Must reside in the Philippines and be comfortable with night shift.",
      locationRaw: "Philippines",
      tags: [],
    });
    expect(v.geoScope).toBe("ph_only");
    expect(v.phEligibility).toBe("eligible_verified");
  });

  it("#5 PH residence phrasing must BEAT the residence-lock pattern", () => {
    const v = geoGate({
      title: "Executive Assistant",
      description: "Must be based in the Philippines. Dayshift schedule, HMO included.",
      locationRaw: null,
      tags: [],
    });
    expect(v.phEligibility).toBe("eligible_verified");
  });

  it("#6 APAC region → apac_incl_ph, eligible", () => {
    const v = geoGate({
      title: "Customer Support (APAC)",
      description: "Supporting customers across the region.",
      locationRaw: "APAC",
      tags: [],
    });
    expect(v.geoScope).toBe("apac_incl_ph");
    expect(v.phEligibility).toBe("eligible_verified");
  });

  it("#7 Timezone-OVERLAP requirement stays eligible (VA reality)", () => {
    const v = geoGate({
      title: "Virtual Assistant",
      description: "Must overlap at least 4 hours with EST business hours. Open to candidates worldwide.",
      locationRaw: null,
      tags: [],
    });
    expect(v.phEligibility).not.toBe("ineligible");
  });

  it("#8 US work-authorization lock → ineligible", () => {
    const v = geoGate({
      title: "Data Entry Specialist",
      description: "Remote position. US work authorization required for this role.",
      locationRaw: null,
      tags: [],
    });
    expect(v.phEligibility).toBe("ineligible");
  });

  it("#9 'must be based in the US' → ineligible", () => {
    const v = geoGate({
      title: "Remote Bookkeeper",
      description: "You must be based in the US to be considered for this position.",
      locationRaw: null,
      tags: [],
    });
    expect(v.phEligibility).toBe("ineligible");
  });

  it("#10 EMEA-only region → region_excl_ph, ineligible", () => {
    const v = geoGate({
      title: "Technical Support Engineer",
      description: "Providing support to enterprise customers.",
      locationRaw: "EMEA",
      tags: [],
    });
    expect(v.geoScope).toBe("region_excl_ph");
    expect(v.phEligibility).toBe("ineligible");
  });

  it("#11 Hybrid marker in title → ineligible (not truly remote)", () => {
    const v = geoGate({
      title: "Customer Success Manager (Hybrid)",
      description: "Own the customer relationship end to end.",
      locationRaw: null,
      tags: [],
    });
    expect(v.phEligibility).toBe("ineligible");
  });

  it("#12 'hybrid' in free description text must NOT reject", () => {
    const v = geoGate({
      title: "Community Manager",
      description: "We use a hybrid of async and sync collaboration across our fully remote team.",
      locationRaw: null,
      tags: [],
    });
    expect(v.phEligibility).not.toBe("ineligible");
  });

  it("#13 Language tag without english → ineligible", () => {
    const v = geoGate({
      title: "Kundenservice Mitarbeiter",
      description: "Support role.",
      locationRaw: null,
      tags: ["customer-service", "german"],
    });
    expect(v.phEligibility).toBe("ineligible");
  });

  it("#14 Language tag WITH english stays open", () => {
    const v = geoGate({
      title: "Bilingual Support Agent",
      description: "Assist customers in English and Spanish across global time zones.",
      locationRaw: "Anywhere in the World",
      tags: ["english", "spanish"],
    });
    expect(v.phEligibility).not.toBe("ineligible");
  });

  it("#15 No signal at all → unknown/unclear (AI decides)", () => {
    const v = geoGate({
      title: "Marketing Coordinator",
      description: "Plan and execute campaigns with our team.",
      locationRaw: null,
      tags: ["marketing"],
    });
    expect(v.geoScope).toBe("unknown");
    expect(v.phEligibility).toBe("unclear");
  });

  it("#16 City-pinned location (Lugano) → ineligible", () => {
    const v = geoGate({
      title: "Customer Service Agent",
      description: "Join our casino operations team.",
      locationRaw: "Lugano",
      tags: [],
    });
    expect(v.geoScope).toBe("country_locked");
    expect(v.phEligibility).toBe("ineligible");
  });

  it("#17 'Remote' alone as location is NOT treated as worldwide proof", () => {
    const v = geoGate({
      title: "Support Specialist",
      description: "Help our users daily.",
      locationRaw: "Remote,",
      tags: [],
    });
    // "Remote" alone carries no geographic guarantee — goes to the AI layer.
    expect(v.phEligibility).toBe("unclear");
  });
});

describe("detectDominantLanguage", () => {
  it("detects Italian job text", () => {
    expect(
      detectDominantLanguage(
        "Per il nostro reparto online stiamo cercando la seguente figura. Occuparsi di assicurare la soddisfazione del cliente durante lo svolgimento di tutte le attività, gestione delle richieste dei clienti."
      )
    ).toBe("it");
  });

  it("detects German job text", () => {
    expect(
      detectDominantLanguage(
        "Wir suchen für unser Unternehmen eine engagierte Person mit Erfahrung. Ihre Aufgaben sind die Betreuung der Kunden und die Bearbeitung von Anfragen sowie die Arbeit mit dem Team bei einer Bewerbung."
      )
    ).toBe("de");
  });

  it("detects Spanish job text", () => {
    expect(
      detectDominantLanguage(
        "Buscamos una persona para nuestra empresa con experiencia en el trabajo con clientes. Los requisitos son la gestión de las solicitudes y el servicio al cliente, estamos creciendo cada año más."
      )
    ).toBe("es");
  });

  it("keeps normal English job text as en", () => {
    expect(
      detectDominantLanguage(
        "We are looking for a customer support specialist to join our team. You will work with our customers to resolve issues and provide an excellent experience with the role and skills."
      )
    ).toBe("en");
  });

  it("keeps mostly-English bilingual postings as en", () => {
    expect(
      detectDominantLanguage(
        "We are hiring a bilingual support agent for the team. You will help customers in English and Spanish. Experience with global teams is required for this role and the work is fully remote."
      )
    ).toBe("en");
  });

  it("fails safe on very short text", () => {
    expect(detectDominantLanguage("Addetto a Customer Service")).toBe("en");
  });
});
