import React, { useState, useMemo } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import type { Opportunity } from '@/lib/db';
import { OpportunityCard } from './opportunity-card';
import { JOB_CATEGORY_MAP } from '@/lib/categories';

interface Props {
  opportunities: Opportunity[];
  category: string;
}

export function CategoryOpportunitySearch({ opportunities, category }: Props) {
  const [query, setQuery] = useState('');
  
  const info = JOB_CATEGORY_MAP[category] || { title: category, color: 'border-ink/10' };

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
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      {/* Navigation & Header Section */}
      <div className="mb-12">
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-extrabold tracking-widest uppercase text-ink/50 hover:text-accent transition-colors group mb-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to categories
        </a>
        
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-ink/10 pb-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-ink">
            {info.title}
          </h2>
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-accent bg-accent/5 border border-accent/20 px-4 py-1.5 rounded-full self-start">
            {filtered.length} {filtered.length === 1 ? 'Job' : 'Jobs'} Found
          </span>
        </div>
      </div>

      {/* Search Bar - Sticky & Glassmorphic */}
      <div className="sticky top-2 md:top-24 z-40 mb-12 pt-2 pb-4 backdrop-blur-md bg-parchment/60 rounded-3xl">

        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
            <Search className="h-5 w-5 text-accent" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search within ${info.title.toLowerCase()}...`}
            className="w-full pl-14 pr-6 py-5 bg-white/80 backdrop-blur-xl border border-ink/10 rounded-full text-ink font-semibold shadow-lg shadow-ink/5 focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all text-lg placeholder:text-ink/30"
          />
          <div className="absolute right-2 inset-y-2">
            <button className="h-full px-8 bg-gradient-to-r from-accent to-accent-hover hover:scale-105 text-white rounded-full font-bold tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-accent/30 active:scale-95">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 bg-white/40 backdrop-blur-md rounded-3xl border border-ink/5 animate-in fade-in zoom-in-95 duration-500">
          <p className="text-ink/40 font-semibold text-xl tracking-tight">No openings found matching "{query}"</p>
          <button 
            onClick={() => setQuery('')} 
            className="mt-4 text-accent font-bold hover:underline underline-offset-4"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="bg-white/50 backdrop-blur-sm border border-ink/5 rounded-3xl p-4 sm:p-6 shadow-xl shadow-ink/5 flex flex-col gap-2">
          {filtered.map((opp, index) => (
            <div 
              key={opp.id}
              className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
              style={{ animationDelay: `${Math.min(index * 50, 400)}ms`, animationDuration: '600ms' }}
            >
              <OpportunityCard opportunity={opp} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
