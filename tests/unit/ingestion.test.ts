import { describe, it, expect, beforeEach } from "bun:test";
import { OpportunitySchema } from "../../packages/db/validation";
import { generateIdempotencyHash } from "../../src/core/sieve";

describe("Nervous System: Ingestion & Sifter Alignment (V10)", () => {
    
    it("RED: Should reject signals using the deprecated 'contentHash' field", () => {
        const legacySignal = {
            id: "test-123",
            title: "VA Support",
            company: "Legacy Co",
            url: "https://jobs.com/1",
            description: "A job description",
            niche: "ADMIN_SUPPORT",
            contentHash: "a1b2c3d4", // Deprecated field name
            scrapedAt: new Date()
        };

        const result = OpportunitySchema.safeParse(legacySignal);
        expect(result.success).toBe(false);
        if (!result.success) {
            const errors = result.error.errors.map(e => e.path.join("."));
            expect(errors).toContain("md5_hash");
        }
    });

    it("RED: Should reject signals if 'md5_hash' (The Idempotency Shield) is missing", () => {
        const invalidSignal = {
            id: "test-456",
            title: "Marketing Expert",
            company: "Growth Co",
            url: "https://jobs.com/2",
            description: "Marketing role",
            niche: "MARKETING"
        };

        const result = OpportunitySchema.safeParse(invalidSignal);
        expect(result.success).toBe(false);
    });

    it("RED: Should verify 'generateIdempotencyHash' produces 32-char MD5 strings", () => {
        const hash = generateIdempotencyHash("Virtual Assistant", "Cloud Support Ltd");
        expect(hash).toHaveLength(32);
        expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it("RED: Should successfully validate a complete V10 Ingestion Payload", () => {
        const validSignal = {
            id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
            md5_hash: generateIdempotencyHash("Sales Lead", "Revenue Inc"),
            title: "Sales Lead",
            company: "Revenue Inc",
            url: "https://revenue.com/jobs/lead",
            description: "High performance sales role.",
            niche: "SALES_GROWTH",
            tier: 1,
            relevanceScore: 85,
            scrapedAt: new Date(),
            isActive: true
        };

        const result = OpportunitySchema.safeParse(validSignal);
        if (!result.success) {
            console.log("Validation Errors:", JSON.stringify(result.error.format(), null, 2));
        }
        expect(result.success).toBe(true);
    });
});
