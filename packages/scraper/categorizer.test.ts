import { describe, expect, it } from "bun:test";
import { categorizeOpportunityTitle } from "./categorizer";

describe("categorizeOpportunityTitle for VA agencies", () => {
  it("categorizes customer service roles accurately", () => {
    expect(categorizeOpportunityTitle("CPT-11421 Amazon Customer Service Virtual Assistant")).toBe("customer-service");
    expect(categorizeOpportunityTitle("Inbound Caller Specialist")).toBe("customer-service");
    expect(categorizeOpportunityTitle("CPT-11511 Patient Engagement & Administrative Virtual Assistant")).toBe("customer-service");
  });

  it("categorizes marketing & sales roles accurately", () => {
    expect(categorizeOpportunityTitle("CPT-11546 B2B Tech Growth & Lead Generation Specialist Virtual Assistant")).toBe("marketing");
    expect(categorizeOpportunityTitle("CPT-11505 Social Media & Content Marketing Virtual Assistant")).toBe("marketing");
    expect(categorizeOpportunityTitle("P-CPT-0006 Amazon PPC - For Pooling Purposes")).toBe("marketing");
    expect(categorizeOpportunityTitle("CPT-11471 Amazon Wholesale FBA Product Sourcing Virtual Assistant")).toBe("marketing");
  });

  it("categorizes finance roles accurately", () => {
    expect(categorizeOpportunityTitle("CPT-11532 Financial & Accounts Receivable Clerk Virtual Assistant")).toBe("finance");
    expect(categorizeOpportunityTitle("CPT-11527 Accounting/Bookkeeping")).toBe("finance");
    expect(categorizeOpportunityTitle("Senior Accountant")).toBe("finance");
  });

  it("categorizes design roles accurately", () => {
    expect(categorizeOpportunityTitle("CPT-11297 Video Editing & Social Media Virtual Assistant")).toBe("design");
    expect(categorizeOpportunityTitle("Graphic Designer")).toBe("design");
  });

  it("categorizes admin / operations roles accurately", () => {
    expect(categorizeOpportunityTitle("CPT-11543 Construction Project Management & Administrative Virtual Assistant")).toBe("admin");
    expect(categorizeOpportunityTitle("CPT-11484 Personal & Family Administrative Virtual Assistant")).toBe("admin");
    expect(categorizeOpportunityTitle("DSP-CPT-11512 Recruiting & Candidate Coordination Virtual Assistant")).toBe("admin");
    expect(categorizeOpportunityTitle("CPT-11533 Executive Administrative Virtual Assistant")).toBe("admin");
    expect(categorizeOpportunityTitle("Operations Virtual Assistant")).toBe("admin");
  });

  it("categorizes tech & engineering roles accurately", () => {
    expect(categorizeOpportunityTitle("Electrical BIM Technician")).toBe("tech");
    expect(categorizeOpportunityTitle("Civil Designer")).toBe("tech");
    expect(categorizeOpportunityTitle("Senior Software Engineer")).toBe("tech");
  });
});
