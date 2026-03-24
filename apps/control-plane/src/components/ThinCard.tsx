/** @jsx h */
import { h } from 'preact';

export function ThinCard({ signal }: { signal: any }) {
  const ageHrs = signal.latestActivityMs ? (Date.now() - signal.latestActivityMs) / 3600000 : 0;
  const isHot = ageHrs < 0.25;

  return (
    <div class="flex items-center justify-between py-2 border-b border-oat-200/50 last:border-0 group">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
        <div class="flex flex-col min-w-0">
          <a 
            href={signal.sourceUrl} 
            target="_blank" 
            class="text-[11px] font-bold text-blueberry-900 truncate hover:text-emerald-600 transition-colors"
          >
            {signal.title}
          </a>
          <span class="text-[9px] font-black text-blueberry-800/30 uppercase tracking-widest truncate">
            {signal.company}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        {isHot && (
          <span class="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            NOW
          </span>
        )}
        <span class="text-[9px] font-bold text-blueberry-800/40 uppercase">
          {isHot ? 'Just in' : 'Recent'}
        </span>
      </div>
    </div>
  );
}
