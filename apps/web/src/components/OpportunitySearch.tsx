import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Opportunity } from '@/lib/db';
import { OpportunityCard } from './opportunity-card';
import { JOB_CATEGORY_MAP, getJobCategory } from '@/lib/categories';

const INITIAL_VISIBLE_COUNT = 5;

// Muted category accent dots — a quiet color signal instead of full colored
// card borders.
const DOT_COLORS: Record<string, string> = {
  'customer-service': 'bg-amber-500',
  'admin': 'bg-emerald-500',
  'marketing': 'bg-orange-500',
  'design': 'bg-violet-500',
  'tech': 'bg-blue-500',
  'finance': 'bg-yellow-600',
  'other': 'bg-ink/30',
};

function JobCategoryCard({ category, jobs, total }: { category: string, jobs: Opportunity[], total?: number }) {
  const info = JOB_CATEGORY_MAP[category] || { title: category, color: 'border-ink/10' };

  if (jobs.length === 0) return null;

  const visibleJobs = jobs.slice(0, INITIAL_VISIBLE_COUNT);
  // Prefer the true active category total (from the server) over the preview
  // subset so the badge and "See all N" reflect the real category size.
  const totalCount = typeof total === 'number' && total >= jobs.length ? total : jobs.length;
  const hasMore = totalCount > INITIAL_VISIBLE_COUNT;
  const dot = DOT_COLORS[category] ?? 'bg-ink/30';

  return (
    <div className="mb-6 break-inside-avoid bg-surface rounded-2xl border border-ink/[0.07] shadow-card overflow-hidden flex flex-col transition-all duration-300 ease-out-soft hover:shadow-soft hover:-translate-y-0.5">
      <a href={`/categories/${category}`} className="group flex items-center justify-between gap-3 px-5 py-4 border-b border-ink/[0.06]">
        <h3 className="flex items-center gap-2.5 font-bold text-[13px] tracking-overline uppercase text-ink/70 group-hover:text-accent transition-colors">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
          {info.title}
        </h3>
        <span className="text-[11px] font-semibold text-ink/45 tabular-nums shrink-0">{totalCount.toLocaleString()}</span>
      </a>
      <div className="p-2 flex flex-col">
        {visibleJobs.map(opp => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}

        {hasMore && (
          <a
            href={`/categories/${category}`}
            className="group mx-2 mt-1 mb-1 py-2.5 rounded-xl text-[13px] font-semibold text-ink/55 hover:text-accent hover:bg-accent-soft/60 transition-all text-center block"
          >
            See all {totalCount.toLocaleString()} jobs <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        )}
      </div>
    </div>
  );
}

export function OpportunitySearch({
  opportunities,
  showSearch = true,
  categoryTotals,
}: {
  opportunities: Opportunity[];
  showSearch?: boolean;
  categoryTotals?: Record<string, number>;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return opportunities;
    const lowerQuery = query.toLowerCase();
    return opportunities.filter(opp => 
      opp.title.toLowerCase().includes(lowerQuery) ||
      (opp.company && opp.company.toLowerCase().includes(lowerQuery)) ||
      opp.sourcePlatform.toLowerCase().includes(lowerQuery)
    );
  }, [opportunities, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, Opportunity[]> = {};
    Object.keys(JOB_CATEGORY_MAP).forEach(k => groups[k] = []);
    
    filtered.forEach(opp => {
      const category = getJobCategory(opp);
      if (!groups[category]) groups[category] = [];
      groups[category].push(opp);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="w-full">

      {showSearch && (
        <div id="search" className="scroll-mt-24 sticky top-[4.5rem] z-40 max-w-2xl mx-auto mb-12">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink/35 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles, companies, or platforms…"
              aria-label="Search opportunities"
              className="w-full h-14 pl-13 pr-5 bg-surface border border-ink/[0.1] rounded-full text-ink text-base font-medium shadow-soft focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-ink/35"
              style={{ paddingLeft: '3.25rem' }}
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-24 bg-surface/60 rounded-2xl border border-ink/[0.07]">
          <p className="text-ink/55 font-semibold text-lg">No matches for “{query}”.</p>
          <p className="text-ink/40 text-sm mt-1">Try a broader term, or clear the search.</p>
          <button onClick={() => setQuery('')} className="mt-5 inline-flex items-center px-4 py-2 rounded-full bg-ink/[0.05] hover:bg-accent-soft text-ink hover:text-accent font-semibold text-sm transition-colors">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 items-start">
          {Object.entries(JOB_CATEGORY_MAP).map(([key, _]) => {
            if (!grouped[key] || grouped[key].length === 0) return null;
            return (
              <JobCategoryCard key={key} category={key} jobs={grouped[key]} total={query.trim() ? undefined : categoryTotals?.[key]} />
            );
          })}
        </div>
      )}
    </div>
  );
}
