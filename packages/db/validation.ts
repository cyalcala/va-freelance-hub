import { z } from "zod";
import { VA_NICHES } from "./schema";

export const OpportunitySchema = z.object({
  id: z.string().uuid().optional(),
  md5_hash: z.string().min(16), // The Idempotency Shield
  title: z.string().min(3).max(255).trim().transform(v => v.replace(/&amp;/g, '&')),
  company: z.string().min(1).max(255).trim(),
  url: z.string().url(),
  salary: z.string().trim().optional().nullable(),
  description: z.string().min(1).trim(),
  niche: z.enum(VA_NICHES),
  type: z.enum(["agency", "direct"]).default("agency"),
  sourcePlatform: z.string().trim().optional().default("Generic"),
  tags: z.preprocess((val) => {
    if (Array.isArray(val)) return JSON.stringify(val);
    if (typeof val === 'string') return val;
    return "[]";
  }, z.string().optional().default("[]")),
  locationType: z.string().trim().default("remote"),
  postedAt: z.preprocess((val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') {
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }, z.date().optional().nullable()),
  scrapedAt: z.date().default(() => new Date()),
  lastSeenAt: z.date().default(() => new Date()),
  isActive: z.boolean().default(true),
  tier: z.coerce.number().int().min(0).max(4).default(3),
  relevanceScore: z.coerce.number().int().default(0),
  latestActivityMs: z.coerce.number().int().default(() => Date.now()),
  companyLogo: z.string().url().trim().optional().nullable().or(z.literal("")),
  metadata: z.string().optional().default("{}")
}).strip();

export type ValidOpportunity = z.infer<typeof OpportunitySchema>;

export function validateOpportunity(data: any): ValidOpportunity | null {
  const result = OpportunitySchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}
