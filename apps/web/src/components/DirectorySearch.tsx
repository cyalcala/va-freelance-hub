import React, { useState, useMemo } from 'react';
import { Search, BadgeCheck, ExternalLink, Globe } from 'lucide-react';

// Using a simplified type for the frontend to avoid complex db dependencies
export type Agency = {
  id: number;
  companyName: string;
  website: string | null;
  niche: string;
  isDayshift: boolean;
  isVerified: boolean;
  isRemote: boolean;
  isMarketplace: boolean;
};

const CATEGORY_MAP: Record<string, { title: string, color: string }> = {
  'australian-dayshift': { title: 'AUSTRALIAN & DAYSHIFT VA', color: 'border-accent/30' },
  'global-va': { title: 'GLOBAL VA & OUTSOURCING', color: 'border-ink/10' },
  'bpo': { title: 'BPO & PROFESSIONAL SERVICES', color: 'border-ink/10' },
  'job-boards': { title: 'JOB BOARDS & RESOURCES', color: 'border-ink/10' },
  'ecommerce': { title: 'E-COMMERCE & MARKETING', color: 'border-ink/10' },
  'tech': { title: 'TECHNOLOGY & SPECIALIZED', color: 'border-ink/10' },
};

const INITIAL_VISIBLE_COUNT = 8;

const NICHE_DOTS: Record<string, string> = {
  'australian-dayshift': 'bg-accent',
  'global-va': 'bg-emerald-500',
  'bpo': 'bg-blue-500',
  'job-boards': 'bg-violet-500',
  'ecommerce': 'bg-orange-500',
  'tech': 'bg-cyan-500',
};

function CategoryCard({ category, agencies }: { category: string, agencies: Agency[] }) {
  const [expanded, setExpanded] = useState(false);
  const info = CATEGORY_MAP[category] || { title: category, color: 'border-ink/10' };

  if (agencies.length === 0) return null;

  const visibleAgencies = expanded ? agencies : agencies.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = agencies.length - INITIAL_VISIBLE_COUNT;
  const dot = NICHE_DOTS[category] ?? 'bg-ink/30';

  return (
    <div className="mb-6 break-inside-avoid bg-surface rounded-2xl border border-ink/[0.07] shadow-card overflow-hidden flex flex-col transition-all duration-300 ease-out-soft hover:shadow-soft">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-ink/[0.06]">
        <h3 className="flex items-center gap-2.5 font-bold text-[13px] tracking-overline uppercase text-ink/70">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
          {info.title}
        </h3>
        <span className="text-[11px] font-semibold text-ink/45 tabular-nums shrink-0">{agencies.length}</span>
      </div>
      <div className="p-2 flex flex-col">
        {visibleAgencies.map(agency => (
          <a key={agency.id} href={agency.website || '#'} target={agency.website ? '_blank' : undefined} rel="noopener noreferrer" className={`group flex items-center gap-3.5 p-3 rounded-xl transition-colors duration-200 ${agency.website ? 'hover:bg-ink/[0.035] cursor-pointer' : 'cursor-default'}`}>
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-ink/[0.08] overflow-hidden">
              {agency.website ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${agency.website}&sz=64`}
                  alt=""
                  aria-hidden="true"
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <Globe className={`w-4 h-4 text-ink/30 ${agency.website ? 'hidden' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-ink text-[15px] group-hover:text-accent transition-colors truncate">
                  {agency.companyName}
                </span>
                {agency.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {agency.isDayshift && <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-soft text-accent font-semibold">Dayshift</span>}
                {agency.isRemote && <span className="text-[10px] px-2 py-0.5 rounded-md bg-ink/[0.05] text-ink/55 font-semibold">Remote</span>}
                {agency.isMarketplace && <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/[0.08] text-violet-700 font-semibold">Marketplace</span>}
              </div>
            </div>
            {agency.website && <ExternalLink className="w-4 h-4 text-ink/25 group-hover:text-accent transition-colors shrink-0" />}
          </a>
        ))}

        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="group mx-2 mt-1 mb-1 py-2.5 rounded-xl text-[13px] font-semibold text-ink/55 hover:text-accent hover:bg-accent-soft/60 transition-all text-center"
          >
            Show {hiddenCount} more <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function DirectorySearch({ directory }: { directory: Agency[] }) {
  const [query, setQuery] = useState('');

  const filteredDirectory = useMemo(() => {
    if (!query.trim()) return directory;
    const lowerQuery = query.toLowerCase();
    return directory.filter(agency => 
      agency.companyName.toLowerCase().includes(lowerQuery)
    );
  }, [directory, query]);

  // Group by niche
  const grouped = useMemo(() => {
    const groups: Record<string, Agency[]> = {};
    Object.keys(CATEGORY_MAP).forEach(k => groups[k] = []);
    
    filteredDirectory.forEach(agency => {
      const niche = agency.niche || 'global-va';
      if (!groups[niche]) groups[niche] = [];
      groups[niche].push(agency);
    });
    return groups;
  }, [filteredDirectory]);

  return (
    <div className="w-full">

      <div id="search" className="scroll-mt-20 sticky top-[4.5rem] z-40 max-w-2xl mb-10">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink/35 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies…"
            aria-label="Search companies"
            className="w-full h-14 pr-5 bg-surface border border-ink/[0.1] rounded-full text-ink text-base font-medium shadow-soft focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all placeholder:text-ink/35"
            style={{ paddingLeft: '3.25rem' }}
          />
        </div>
      </div>

      {filteredDirectory.length === 0 ? (
        <div className="text-center py-24 bg-surface/60 rounded-2xl border border-ink/[0.07]">
          <p className="text-ink/55 font-semibold text-lg">No companies match “{query}”.</p>
          <button onClick={() => setQuery('')} className="mt-5 inline-flex items-center px-4 py-2 rounded-full bg-ink/[0.05] hover:bg-accent-soft text-ink hover:text-accent font-semibold text-sm transition-colors">Clear search</button>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-6">
          {Object.entries(CATEGORY_MAP).map(([key, _]) => {
            if (!grouped[key] || grouped[key].length === 0) return null;
            return (
              <CategoryCard key={key} category={key} agencies={grouped[key]} />
            );
          })}
        </div>
      )}
    </div>
  );
}
