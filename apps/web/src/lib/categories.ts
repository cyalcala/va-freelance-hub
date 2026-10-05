import type { Opportunity } from '@/lib/db';

export const JOB_CATEGORY_MAP: Record<string, { title: string, color: string }> = {
  'ai': { title: 'AI & AUTOMATION', color: 'border-cyan-500/30' },
  'writing': { title: 'WRITING & CONTENT', color: 'border-rose-500/30' },
  'customer-service': { title: 'CUSTOMER SERVICE', color: 'border-yellow-500/30' },
  'admin': { title: 'ADMIN & OPERATIONS', color: 'border-emerald-500/30' },
  'marketing': { title: 'MARKETING & SALES', color: 'border-orange-500/30' },
  'design': { title: 'DESIGN & CREATIVE', color: 'border-purple-500/30' },
  'tech': { title: 'ENGINEERING & IT', color: 'border-blue-500/30' },
  'finance': { title: 'FINANCE & ACCOUNTING', color: 'border-amber-600/30' },
  'other': { title: 'GENERAL & OTHER', color: 'border-ink/10' },
};

export function getJobCategory(opp: Opportunity): string {
  return opp.category || 'other';
}

export type JobCategory = { slug: string; title: string; color: string };

/**
 * Resolve a category slug to its label, or `null` when the slug is not one of
 * ours.
 *
 * `Object.hasOwn`, not a truthiness lookup: `JOB_CATEGORY_MAP['constructor']`
 * resolves through the prototype chain to a function, which defeated the
 * `/categories/[category]` guard and made that route read `.title` off a
 * function. One call now returns the slug and the label together, so no public
 * surface has to index the map a second time and re-introduce that check.
 */
export function parseJobCategory(value: string | null | undefined): JobCategory | null {
  if (!value) return null;
  if (!Object.hasOwn(JOB_CATEGORY_MAP, value)) return null;
  const { title, color } = JOB_CATEGORY_MAP[value];
  return { slug: value, title, color };
}

/** The fallback label used when a stored category is absent or unrecognised. */
export const OTHER_JOB_CATEGORY: JobCategory = { slug: 'other', ...JOB_CATEGORY_MAP['other'] };
