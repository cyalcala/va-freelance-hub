import { describe, it, expect } from "bun:test";
import {
  classifyFocusGroup,
  extractDomain,
  type IntakeRawItem,
} from "./human-intake";
import { sha256Hex } from "./lake-shared";

describe("Human Research Intake — HRI-01 & HRI-02 Contracts", () => {
  it("extracts and normalizes domains safely", () => {
    expect(extractDomain("https://www.cloudstaff.com/careers")).toBe("cloudstaff.com");
    expect(extractDomain("http://affordablestaff.com.au/")).toBe("affordablestaff.com.au");
    expect(extractDomain("https://subdomain.example.com/path?query=1")).toBe("subdomain.example.com");
    expect(extractDomain(null)).toBeNull();
    expect(extractDomain("")).toBeNull();
    expect(extractDomain("not-a-url")).toBeNull();
  });

  it("prioritizes Australian & Dayshift companies as Priority 1", () => {
    const item1: IntakeRawItem = {
      companyName: "Affordable Staff",
      website: "https://affordablestaff.com.au/",
      niche: "australian-dayshift",
      isDayshift: true,
      isVerified: true,
      isRemote: true,
      isMarketplace: false,
    };
    const c1 = classifyFocusGroup(item1);
    expect(c1.focusGroup).toBe("australian_dayshift");
    expect(c1.priority).toBe(1);
    expect(c1.entityType).toBe("company_lead");

    const item2: IntakeRawItem = {
      companyName: "DayShift Agency",
      website: "https://dayshift.com",
      niche: "general",
      isDayshift: true,
    };
    const c2 = classifyFocusGroup(item2);
    expect(c2.focusGroup).toBe("australian_dayshift");
    expect(c2.priority).toBe(1);
  });

  it("prioritizes Global VA companies as Priority 1", () => {
    const item: IntakeRawItem = {
      companyName: "20Four7VA",
      website: "https://20four7va.com/",
      niche: "global-va",
      isDayshift: false,
      isVerified: true,
      isRemote: true,
      isMarketplace: false,
    };
    const c = classifyFocusGroup(item);
    expect(c.focusGroup).toBe("global_va");
    expect(c.priority).toBe(1);
    expect(c.entityType).toBe("company_lead");
  });

  it("prioritizes Job Boards and Marketplaces as Priority 1 Source Leads", () => {
    const item1: IntakeRawItem = {
      companyName: "Wellfound",
      website: "https://wellfound.com/",
      niche: "job-boards",
      isDayshift: false,
      isVerified: true,
      isRemote: true,
      isMarketplace: true,
    };
    const c1 = classifyFocusGroup(item1);
    expect(c1.focusGroup).toBe("job_boards");
    expect(c1.priority).toBe(1);
    expect(c1.entityType).toBe("source_lead");

    const item2: IntakeRawItem = {
      companyName: "Custom Marketplace",
      website: "https://example.com",
      isMarketplace: true,
    };
    const c2 = classifyFocusGroup(item2);
    expect(c2.focusGroup).toBe("job_boards");
    expect(c2.priority).toBe(1);
    expect(c2.entityType).toBe("source_lead");
  });

  it("classifies BPO, Tech, and E-Commerce as Priority 2", () => {
    const bpoItem: IntakeRawItem = { companyName: "Alorica", niche: "bpo" };
    expect(classifyFocusGroup(bpoItem)).toEqual({
      focusGroup: "bpo",
      priority: 2,
      entityType: "company_lead",
    });

    const techItem: IntakeRawItem = { companyName: "GitLab", niche: "tech" };
    expect(classifyFocusGroup(techItem)).toEqual({
      focusGroup: "tech",
      priority: 2,
      entityType: "company_lead",
    });

    const ecomItem: IntakeRawItem = { companyName: "Shopify", niche: "ecommerce" };
    expect(classifyFocusGroup(ecomItem)).toEqual({
      focusGroup: "ecommerce",
      priority: 2,
      entityType: "company_lead",
    });
  });

  it("computes deterministic batch content hash", () => {
    const data = [{ companyName: "A" }, { companyName: "B" }];
    const h1 = sha256Hex(JSON.stringify(data));
    const h2 = sha256Hex(JSON.stringify(data));
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
  });
});
