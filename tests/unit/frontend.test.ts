import { describe, it, expect } from "bun:test";
import { JobDomain, JobDomainLabels } from "../../packages/db/taxonomy";
import { OpportunitySchema } from "../../packages/db/validation";

describe("Frontend Taxonomy & Signal Alignment (V10)", () => {
    it("RED: Should fail if the legacy 'VA_SUPPORT' domain is still in JobDomain", () => {
        // In V10, VA_SUPPORT is re-mapped to ADMIN_SUPPORT.
        // If this passes, it means the taxonomy hasn't been aligned yet.
        const domains = Object.keys(JobDomain);
        expect(domains).not.toContain("VA_SUPPORT");
    });

    it("RED: Should fail if JobDomainLabels is missing the new strict niches", () => {
        const labels = Object.keys(JobDomainLabels);
        expect(labels).toContain("MARKETING");
        expect(labels).toContain("CUSTOMER_SERVICE");
    });

    it("RED: Should reject signal objects using deprecated 'sourceUrl' field", () => {
        const legacySignal = {
            title: "Senior VA",
            company: "Legacy Hub",
            sourceUrl: "https://legacy.com/job/1", // Deprecated field name
            md5_hash: "a1b2c3d4e5f67890",
            description: "A legacy job description.",
            niche: "TECH_ENGINEERING"
        };

        const result = OpportunitySchema.safeParse(legacySignal);
        
        // This is expected to fail (RED) because 'sourceUrl' is no longer in the schema.
        expect(result.success).toBe(false);
        if (!result.success) {
            const hasUrlError = result.error.errors.some(e => e.path.includes("url"));
            expect(hasUrlError).toBe(true);
        }
    });

    it("RED: Should successfully validate V10 signal and confirm niche label availability", () => {
        const v10Signal = {
            title: "Growth Hacker",
            company: "Marketing Pro",
            url: "https://marketing.ai/job/1",
            md5_hash: "f6e5d4c3b2a10987",
            description: "High-impact marketing.",
            niche: "MARKETING"
        };

        const result = OpportunitySchema.safeParse(v10Signal);
        
        // If this is false, implementation is incomplete.
        expect(result.success).toBe(true);
        if (result.success) {
            // @ts-ignore - Niche should exist in JobDomainLabels after alignment
            expect(JobDomainLabels[v10Signal.niche]).toBeDefined();
        }
    });
});
