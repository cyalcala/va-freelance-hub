import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Opportunity } from '@/lib/db';
import { OpportunityCard } from './opportunity-card';

const JOB_CATEGORY_MAP: Record<string, { title: string, color: string }> = {
  'customer-service': { title: 'CUSTOMER SERVICE', color: 'border-yellow-500/30' },
  'admin': { title: 'ADMIN & OPERATIONS', color: 'border-emerald-500/30' },
  'marketing': { title: 'MARKETING & SALES', color: 'border-orange-500/30' },
  'design': { title: 'DESIGN & CREATIVE', color: 'border-purple-500/30' },
  'tech': { title: 'ENGINEERING & IT', color: 'border-blue-500/30' },
  'other': { title: 'GENERAL & OTHER', color: 'border-ink/10' },
};

function getJobCategory(opp: Opportunity): string {
  const text = `${opp.title} ${Array.isArray(opp.tags) ? opp.tags.join(' ') : ''}`.toLowerCase();
  
  if (text.match(/developer|engineer|programmer|software|web|full stack|backend|frontend|react|node|tech|data|python/)) return 'tech';
  if (text.match(/marketing|seo|social media|content|sales|copywriter|growth|outreach/)) return 'marketing';
  if (text.match(/design|ui|ux|graphic|illustrator|video|animat|creative/)) return 'design';
  if (text.match(/customer|support|chat|ticket|csr|client/)) return 'customer-service';
  if (text.match(/admin|virtual assistant|data entry|hr|recruiter|operation|executive|management/)) return 'admin';
  return 'other';
}

const INITIAL_VISIBLE_COUNT = 5;

function JobCategoryCard({ category, jobs }: { category: string, jobs: Opportunity[] }) {
  const [expanded, setExpanded] = useState(false);
  const info = JOB_CATEGORY_MAP[category] || { title: category, color: 'border-ink/10' };
  
  if (jobs.length === 0) return null;

  const visibleJobs = expanded ? jobs : jobs.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = jobs.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className={`mb-8 break-inside-avoid bg-white/70 backdrop-blur-sm rounded-3xl border ${info.color} shadow-lg shadow-ink/5 overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl duration-300`}>
      <div className="bg-gradient-to-r from-ink/5 to-transparent border-b border-ink/5 py-4 px-5 flex items-center justify-between">
        <h3 className="font-extrabold text-sm tracking-widest uppercase text-ink/80">{info.title}</h3>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 bg-ink/10 px-2 py-0.5 rounded-full">{jobs.length} JOBS</span>
      </div>
      <div className="p-3 flex flex-col gap-1">
        {visibleJobs.map(opp => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
        
        {!expanded && hiddenCount > 0 && (
          <button 
            onClick={() => setExpanded(true)}
            className="mt-3 mx-2 mb-2 py-3 bg-ink/5 rounded-xl text-xs font-bold tracking-widest uppercase text-ink/50 hover:text-ink hover:bg-ink/10 transition-all text-center group"
          >
            See all {hiddenCount} jobs <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function OpportunitySearch({ opportunities }: { opportunities: Opportunity[] }) {
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      
      {/* Search Bar - Sticky & Glassmorphic */}
      <div className="sticky top-24 z-40 max-w-3xl mx-auto mb-16 pt-2 pb-4 backdrop-blur-md bg-parchment/60 rounded-3xl px-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
            <Search className="h-5 w-5 text-accent" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles, companies, or platforms..."
            className="w-full pl-14 pr-6 py-5 bg-white/80 backdrop-blur-xl border border-ink/10 rounded-full text-ink font-semibold shadow-lg shadow-ink/5 focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all text-lg placeholder:text-ink/30"
          />
          <div className="absolute right-2 inset-y-2">
            <button className="h-full px-8 bg-gradient-to-r from-accent to-accent-hover hover:scale-105 text-white rounded-full font-bold tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-accent/30 active:scale-95">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout to force left-to-right order instead of columns */}
      {filtered.length === 0 ? (
        <div className="text-center py-32 bg-white/40 backdrop-blur-md rounded-3xl border border-ink/5 animate-in fade-in zoom-in-95 duration-500">
          <p className="text-ink/40 font-semibold text-xl tracking-tight">No opportunities found matching "{query}"</p>
          <button onClick={() => setQuery('')} className="mt-4 text-accent font-bold hover:underline underline-offset-4">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
          {Object.entries(JOB_CATEGORY_MAP).map(([key, _], index) => {
            if (!grouped[key] || grouped[key].length === 0) return null;
            return (
              <div 
                key={key} 
                className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                style={{ animationDelay: `${index * 150}ms`, animationDuration: '800ms' }}
              >
                <JobCategoryCard category={key} jobs={grouped[key]} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
