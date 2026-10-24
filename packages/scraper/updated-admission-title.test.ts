import { describe, expect, test } from "bun:test";
import { updatedAdmissionTitle } from "./updated-admission-title";

describe("updatedAdmissionTitle", () => {
  test("accepts a distinct, valid source title", () => {
    expect(
      updatedAdmissionTitle("Recruitment Specialist", "Talent Acquisition Specialist"),
    ).toBe("Talent Acquisition Specialist");
  });

  test("rejects identical title", () => {
    expect(
      updatedAdmissionTitle("Recruitment Specialist", "Recruitment Specialist"),
    ).toBeNull();
    expect(
      updatedAdmissionTitle("Recruitment Specialist", "  Recruitment Specialist  "),
    ).toBeNull();
  });

  test("rejects non-string or empty titles", () => {
    expect(updatedAdmissionTitle(null, "Talent Acquisition Specialist")).toBeNull();
    expect(updatedAdmissionTitle("Recruitment Specialist", null)).toBeNull();
    expect(updatedAdmissionTitle("", "Talent Acquisition Specialist")).toBeNull();
    expect(updatedAdmissionTitle("Recruitment Specialist", "")).toBeNull();
    expect(updatedAdmissionTitle("Recruitment Specialist", "   ")).toBeNull();
  });

  test("rejects obvious geographic restrictions", () => {
    expect(
      updatedAdmissionTitle("Recruitment Specialist", "Accountant - US Only"),
    ).toBeNull();
    expect(
      updatedAdmissionTitle("Recruitment Specialist", "Customer Support (Canada only)"),
    ).toBeNull();
  });

  test("rejects obvious non-English or local-only titles", () => {
    expect(
      updatedAdmissionTitle("Recruitment Specialist", "Werkstudent Talent Acquisition (m/w/d)"),
    ).toBeNull();
    expect(
      updatedAdmissionTitle("Recruitment Specialist", "Recruteur bilingue H/F"),
    ).toBeNull();
  });
});
