import type { Opportunity } from '@/lib/db';

export const JOB_CATEGORY_MAP: Record<string, { title: string, color: string }> = {
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
