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

    it("GREEN: Should successfully validate a Virtual Assistant payload", () => {
        const payload = {
            title: "General VA",
            company: "VA Hub",
            url: "https://v10.ai/jobs/va1",
            md5_hash: "va_hash_1234567890",
            description: "General support.",
            niche: "VA_SUPPORT"
        };
        const result = OpportunitySchema.safeParse(payload);
        if (!result.success) console.error(result.error);
        expect(result.success).toBe(true);
    });

    it("GREEN: Should successfully validate an Admin/Backoffice payload", () => {
        const payload = {
            title: "Junior Accountant",
            company: "FinCorp",
            url: "https://v10.ai/jobs/acc1",
            md5_hash: "acc_hash_6789012345",
            description: "Invoice and CRM management.",
            niche: "ADMIN_BACKOFFICE"
        };
        const result = OpportunitySchema.safeParse(payload);
        if (!result.success) console.error(result.error);
        expect(result.success).toBe(true);
    });
});
