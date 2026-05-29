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

function CategoryCard({ category, agencies }: { category: string, agencies: Agency[] }) {
  const [expanded, setExpanded] = useState(false);
  const info = CATEGORY_MAP[category] || { title: category, color: 'border-ink/10' };
  
  if (agencies.length === 0) return null;

  const visibleAgencies = expanded ? agencies : agencies.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = agencies.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className={`mb-8 break-inside-avoid bg-white/70 backdrop-blur-sm rounded-3xl border ${info.color} shadow-lg shadow-ink/5 overflow-hidden flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 duration-300`}>
      <div className="bg-gradient-to-r from-ink/5 to-transparent border-b border-ink/5 py-4 px-5 flex items-center justify-between">
        <h3 className="font-extrabold text-sm tracking-widest uppercase text-ink/80">{info.title}</h3>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 bg-ink/10 px-2 py-0.5 rounded-full">{agencies.length} SITES</span>
      </div>
      <div className="p-3 flex flex-col gap-1">
        {visibleAgencies.map(agency => (
          <a key={agency.id} href={agency.website || '#'} target="_blank" rel="noopener noreferrer" className={`flex items-start justify-between group p-3 rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-sm ${agency.website ? 'cursor-pointer' : 'cursor-default'}`}>
            <div className="flex items-center gap-4 w-full">
              <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center shrink-0 border border-ink/5 overflow-hidden group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                {agency.website ? (
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${agency.website}&sz=64`} 
                    alt={agency.companyName}
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <Globe className={`w-4 h-4 text-ink/30 ${agency.website ? 'hidden' : ''}`} />
              </div>
              <div className="flex-1 transform group-hover:translate-x-1 transition-transform duration-300">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-ink/90 text-sm group-hover:text-accent transition-colors">
                    {agency.companyName}
                  </span>
                  {agency.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500/80 drop-shadow-sm" />}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {agency.isDayshift && <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-black uppercase tracking-wider">Dayshift</span>}
                  {agency.isRemote && <span className="text-[9px] px-2 py-0.5 rounded-full bg-ink/5 text-ink/60 font-black uppercase tracking-wider">Remote</span>}
                  {agency.isMarketplace && <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-black uppercase tracking-wider">Marketplace</span>}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-2 group-hover:translate-x-0">
                {agency.website && <ExternalLink className="w-4 h-4 text-accent/50" />}
              </div>
            </div>
          </a>
        ))}
        
        {!expanded && hiddenCount > 0 && (
          <button 
            onClick={() => setExpanded(true)}
            className="mt-3 mx-2 mb-2 py-3 bg-ink/5 rounded-xl text-xs font-bold tracking-widest uppercase text-ink/50 hover:text-ink hover:bg-ink/10 transition-all text-center group"
          >
            See all {hiddenCount} sites <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      
      {/* Search Bar - Sticky & Glassmorphic */}
      <div className="sticky top-2 md:top-24 z-40 max-w-3xl mx-auto mb-16 pt-2 pb-4 backdrop-blur-md bg-parchment/60 rounded-3xl px-2">

        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
            <Search className="h-5 w-5 text-accent" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 200+ companies..."
            className="w-full pl-14 pr-6 py-5 bg-white/80 backdrop-blur-xl border border-ink/10 rounded-full text-ink font-semibold shadow-lg shadow-ink/5 focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10 transition-all text-lg placeholder:text-ink/30"
          />
          <div className="absolute right-2 inset-y-2">
            <button className="h-full px-8 bg-gradient-to-r from-accent to-accent-hover hover:scale-105 text-white rounded-full font-bold tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-accent/30 active:scale-95">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Masonry Grid */}
      {filteredDirectory.length === 0 ? (
        <div className="text-center py-32 bg-white/40 backdrop-blur-md rounded-3xl border border-ink/5 animate-in fade-in zoom-in-95 duration-500">
          <p className="text-ink/40 font-semibold text-xl tracking-tight">No companies found matching "{query}"</p>
          <button onClick={() => setQuery('')} className="mt-4 text-accent font-bold hover:underline underline-offset-4">Clear search</button>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-8">
          {Object.entries(CATEGORY_MAP).map(([key, _], index) => {
            if (!grouped[key] || grouped[key].length === 0) return null;
            return (
              <div 
                key={key} 
                className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
                style={{ animationDelay: `${index * 150}ms`, animationDuration: '800ms' }}
              >
                <CategoryCard category={key} agencies={grouped[key]} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
