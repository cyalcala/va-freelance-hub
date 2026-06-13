import { describe, it, expect } from "bun:test";
import { isObviousNonEnglishOrLocalOnly, isObviousGeoRestriction } from "./triage";

describe("isObviousNonEnglishOrLocalOnly", () => {
  it("should match German legal gender flags (m/w/d, w/m/d, m/w/x)", () => {
    expect(isObviousNonEnglishOrLocalOnly("Werkstudent (m/w/d) SAP-Consulting im Kundenservice", "")).toBe(true);
    expect(isObviousNonEnglishOrLocalOnly("SAP Berater (w/m/d)", "")).toBe(true);
    expect(isObviousNonEnglishOrLocalOnly("Consultant (m/w/x) Kundenservice", "")).toBe(true);
  });

  it("should match French legal gender flags (H/F)", () => {
    expect(isObviousNonEnglishOrLocalOnly("Développeur Front-End (H/F) en Alternance", "")).toBe(true);
    expect(isObviousNonEnglishOrLocalOnly("Assistant Marketing H/F", "")).toBe(true);
  });

  it("should match German/French localized scheme words", () => {
    expect(isObviousNonEnglishOrLocalOnly("Werkstudent Software Engineering", "")).toBe(true);
    expect(isObviousNonEnglishOrLocalOnly("Alternance - Assistant Product Manager", "")).toBe(true);
    expect(isObviousNonEnglishOrLocalOnly("Apprentissage Développeur Web", "")).toBe(true);
    expect(isObviousNonEnglishOrLocalOnly("Developer (CDI)", "")).toBe(true);
    expect(isObviousNonEnglishOrLocalOnly("Praktikum Online Marketing", "")).toBe(true);
  });

  it("should NOT match standard English titles", () => {
    expect(isObviousNonEnglishOrLocalOnly("Senior Software Engineer", "We are looking for a full stack engineer.")).toBe(false);
    expect(isObviousNonEnglishOrLocalOnly("Virtual Assistant", "Looking for a dedicated virtual assistant.")).toBe(false);
  });

  it("should NOT match English words like 'stage' when used in context", () => {
    expect(isObviousNonEnglishOrLocalOnly("Frontend Developer", "We are an early stage startup looking for a developer to join the stage.")).toBe(false);
  });
});

describe("isObviousGeoRestriction", () => {
  it("should match US/UK/Canada geographic exclusions", () => {
    expect(isObviousGeoRestriction("Virtual Assistant (US Only)", "")).toBe(true);
    expect(isObviousGeoRestriction("Developer", "United Kingdom Only")).toBe(true);
    expect(isObviousGeoRestriction("Marketing Coordinator", "US timezone only")).toBe(true);
  });

  it("should NOT match standard global roles", () => {
    expect(isObviousGeoRestriction("Senior React Developer", "Open to candidates worldwide.")).toBe(false);
  });
});
