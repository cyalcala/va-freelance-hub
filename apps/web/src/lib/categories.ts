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
  if (opp.category && opp.category !== 'other') {
    return opp.category;
  }
  
  const text = `${opp.title} ${Array.isArray(opp.tags) ? opp.tags.join(' ') : ''}`.toLowerCase();
  
  if (text.match(/developer|engineer|programmer|software|web|full stack|backend|frontend|react|node|tech|data|python/)) return 'tech';
  if (text.match(/marketing|seo|social media|content|sales|copywriter|growth|outreach/)) return 'marketing';
  if (text.match(/design|ui|ux|graphic|illustrator|video|animat|creative/)) return 'design';
  if (text.match(/customer|support|chat|ticket|csr|client/)) return 'customer-service';
  if (text.match(/admin|virtual assistant|data entry|hr|recruiter|operation|executive|management/)) return 'admin';
  if (text.match(/bookkeeper|accounting|finance|audit|billing|collections|payroll/)) return 'finance';
  
  return opp.category || 'other';
}
