import type { Opportunity } from "@/lib/db";

interface Props {
  opportunity: Opportunity;
}

const PLATFORM_COLORS: Record<string, string> = {
  WeWorkRemotely: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
  Remotive: "text-sky-700 bg-sky-500/10 border-sky-500/20",
  ProBlogger: "text-orange-700 bg-orange-500/10 border-orange-500/20",
  RemoteCo: "text-purple-700 bg-purple-500/10 border-purple-500/20",
  OnlineJobsPH: "text-yellow-700 bg-yellow-500/10 border-yellow-500/20",
};

const TYPE_LABELS: Record<string, string> = {
  VA: "VA",
  freelance: "Freelance",
  project: "Project",
  "full-time": "Full-time",
  "part-time": "Part-time",
};

export function OpportunityCard({ opportunity: opp }: Props) {
  const platformColor =
    PLATFORM_COLORS[opp.sourcePlatform] ?? "text-ink/70 bg-ink/5 border-ink/10";
  const typeLabel = TYPE_LABELS[opp.type] ?? opp.type;
  const postedDate = opp.postedAt
    ? new Date(opp.postedAt).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <a 
      href={opp.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-ink/10 rounded-2xl p-5 bg-white/60 backdrop-blur-sm hover:bg-white hover:border-accent hover:shadow-card transition-all duration-300 flex flex-col gap-4 group cursor-pointer"
    >
      {/* Platform + type badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border ${platformColor}`}
        >
          {opp.sourcePlatform}
        </span>
        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-md text-ink/60 bg-ink/5 border border-ink/10">
          {typeLabel}
        </span>
      </div>

      {/* Title */}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-ink line-clamp-2 leading-tight group-hover:text-accent transition-colors">
          {opp.title}
        </h3>
        {opp.company && (
          <p className="text-sm font-semibold text-ink/50 mt-1 uppercase tracking-wider">{opp.company}</p>
        )}
      </div>

      {/* Tags */}
      {opp.tags && Array.isArray(opp.tags) && opp.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(opp.tags as string[]).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-ink/5 text-ink/50"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-ink/5 mt-auto">
        {postedDate && (
          <span className="text-[10px] font-bold tracking-widest uppercase text-ink/40">{postedDate}</span>
        )}
        <span
          className="ml-auto text-xs font-bold tracking-widest uppercase text-accent group-hover:text-accent-hover transition-colors flex items-center gap-1 group-hover:translate-x-1"
        >
          Apply Now <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
        </span>
      </div>
    </a>
  );
}
