import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Opportunity } from '@/lib/db';
import { OpportunityCard } from './opportunity-card';

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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-32 bg-white/40 backdrop-blur-md rounded-3xl border border-ink/5 animate-in fade-in zoom-in-95 duration-500">
          <p className="text-ink/40 font-semibold text-xl tracking-tight">No opportunities found matching "{query}"</p>
          <button onClick={() => setQuery('')} className="mt-4 text-accent font-bold hover:underline underline-offset-4">Clear search</button>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-8">
          {filtered.map((opp, index) => (
            <div 
              key={opp.id} 
              className="mb-8 break-inside-avoid animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
              style={{ animationDelay: `${(index % 15) * 50}ms`, animationDuration: '600ms' }}
            >
              <OpportunityCard opportunity={opp} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
