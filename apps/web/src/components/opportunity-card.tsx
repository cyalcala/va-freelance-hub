import type { Opportunity } from "@/lib/db";

interface Props {
  opportunity: Opportunity;
}

const PLATFORM_COLORS: Record<string, string> = {
  WeWorkRemotely: "text-emerald-400 bg-emerald-400/10",
  Remotive: "text-sky-400 bg-sky-400/10",
  ProBlogger: "text-orange-400 bg-orange-400/10",
  RemoteCo: "text-purple-400 bg-purple-400/10",
  OnlineJobsPH: "text-yellow-400 bg-yellow-400/10",
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
    PLATFORM_COLORS[opp.sourcePlatform] ?? "text-zinc-400 bg-zinc-400/10";
  const typeLabel = TYPE_LABELS[opp.type] ?? opp.type;
  const postedDate = opp.postedAt
    ? new Date(opp.postedAt).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="border border-border rounded-xl p-4 bg-surface hover:border-zinc-600 transition-colors flex flex-col gap-3 group">
      {/* Platform + type badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${platformColor}`}
        >
          {opp.sourcePlatform}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full text-zinc-400 bg-zinc-400/10">
          {typeLabel}
        </span>
      </div>

      {/* Title */}
      <div className="flex-1">
        <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 leading-snug">
          {opp.title}
        </h3>
        {opp.company && (
          <p className="text-xs text-zinc-500 mt-1">{opp.company}</p>
        )}
      </div>

      {/* Tags */}
      {opp.tags && Array.isArray(opp.tags) && opp.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(opp.tags as string[]).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        {postedDate && (
          <span className="text-[10px] font-mono text-zinc-600">{postedDate}</span>
        )}
        <a
          href={opp.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-accent hover:text-accent-hover transition-colors font-medium"
        >
          Apply →
        </a>
      </div>
    </div>
  );
}
