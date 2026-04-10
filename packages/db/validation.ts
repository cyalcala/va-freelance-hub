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

export const AIExtractionSchema = z.object({
  title: z.string().min(2).max(255).trim(),
  company: z.preprocess((val) => val === null ? "Confidential Client" : val, z.string().min(1).default("Confidential Client").catch("Confidential Client")),
  salary: z.string().trim().optional().nullable(),
  description: z.string().min(10).trim(),
  niche: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const normalized = val.toUpperCase().replace(/\s+/g, '_');
    
    // Exact Match
    if (VA_NICHES.includes(normalized as any)) return normalized;

    // Fuzzy Routing (The Intelligence Mesh)
    if (normalized.includes('ACCOUNTING') || normalized.includes('BOOKKEEPER') || normalized.includes('FINANCE')) return 'ADMIN_BACKOFFICE';
    if (normalized.includes('DEVELOPER') || normalized.includes('SOFTWARE') || normalized.includes('ENGINEER')) return 'TECH_ENGINEERING';
    if (normalized.includes('MARKETING') || normalized.includes('SOCIAL_MEDIA') || normalized.includes('SEO')) return 'MARKETING';
    if (normalized.includes('SALES') || normalized.includes('GROWTH') || normalized.includes('BUSINESS_DEVELOPMENT')) return 'SALES_GROWTH';
    if (normalized.includes('DESIGN') || normalized.includes('EDITOR') || normalized.includes('CREATIVE') || normalized.includes('VIDEO')) return 'CREATIVE_MULTIMEDIA';
    if (normalized.includes('CUSTOMER') || normalized.includes('SUPPORT') || normalized.includes('BPO') || normalized.includes('HELP_DESK') || normalized.includes('MODERATOR') || normalized.includes('CSR') || normalized.includes('CALL_CENTER') || normalized.includes('VOICE')) return 'BPO_SERVICES';
    if (normalized.includes('VIRTUAL_ASSISTANT') || normalized.includes('VA') || normalized.includes('EXECUTIVE') || normalized.includes('ADMIN')) return 'VA_SUPPORT';

    // 🛡️ AEGIS FALLBACK: Instead of erroring out, map to VA_SUPPORT to maintain UI visibility
    // but the system will log this as a fuzzy-unmatched category in the kitchen.
    return "VA_SUPPORT"; 
  }, z.enum(VA_NICHES)),
  tier: z.coerce.number().int().min(0).max(4).default(3),
  relevanceScore: z.coerce.number().int().min(0).max(100).default(50),
  isPhCompatible: z.preprocess((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val.toLowerCase() === 'yes';
    return true; // Default to pass
  }, z.boolean().default(true)),
  type: z.preprocess((val) => val === null ? "agency" : val, z.enum(["agency", "direct"]).default("agency").catch("agency")),
  locationType: z.string().default("remote"),
  metadata: z.record(z.any()).optional().default({})
}).strip();

export type ValidOpportunity = z.infer<typeof OpportunitySchema>;
export type AIExtraction = z.infer<typeof AIExtractionSchema>;

export function validateOpportunity(data: any): ValidOpportunity | null {
  const result = OpportunitySchema.safeParse(data);
  return result.success ? result.data : null;
}

export function validateAIExtraction(data: any): AIExtraction | null {
  const result = AIExtractionSchema.safeParse(data);
  return result.success ? result.data : null;
}
