import { describe, it, expect } from "bun:test";
import { OpportunitySchema } from "../../packages/db/validation";

describe("Drizzle Schema & Border Patrol Invariants", () => {
    it("GREEN: Should reject payloads missing the md5_hash idempotency shield", () => {
        const payload = {
            title: "Senior SRE",
            company: "V10 Global",
            url: "https://v10.ai/jobs/1",
            description: "Distributed systems management.",
            niche: "TECH_ENGINEERING"
        };
        
        const result = OpportunitySchema.safeParse(payload);
        
        // This is expected to reject the payload (success: false)
        expect(result.success).toBe(false);
        if (!result.success) {
            const hasMd5Error = result.error.errors.some(e => e.path.includes("md5_hash"));
            expect(hasMd5Error).toBe(true);
        }
    });

    it("GREEN: Should reject invalid niches outside the Filipino VA taxonomy", () => {
        const payload = {
            title: "VA",
            company: "Generic",
            url: "https://example.com",
            md5_hash: "mock_hash_1234567890",
            description: "Description",
            niche: "ONLYFANS_VA" // Invalid niche
        };
        
        const result = OpportunitySchema.safeParse(payload);
        
        // This is expected to reject 'ONLYFANS_VA'
        expect(result.success).toBe(false);
        if (!result.success) {
            const hasNicheError = result.error.errors.some(e => e.path.includes("niche"));
            expect(hasNicheError).toBe(true);
        }
    });

    it("GREEN: Should successfully validate a perfect V10 payload", () => {
        const payload = {
            title: "Senior SRE",
            company: "V10 Global",
            url: "https://v10.ai/jobs/1",
            md5_hash: "a1b2c3d4e5f67890",
            description: "Distributed systems management.",
            niche: "TECH_ENGINEERING"
        };
        
        const result = OpportunitySchema.safeParse(payload);
        
        // This should pass perfectly.
        if (!result.success) {
            console.error(result.error.errors);
        }
        expect(result.success).toBe(true);
    });
});
