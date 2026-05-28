import type { Opportunity } from "@/lib/db";
import { Briefcase, ExternalLink } from "lucide-react";

interface Props {
  opportunity: Opportunity;
}

const PLATFORM_COLORS: Record<string, string> = {
  WeWorkRemotely: "text-emerald-700 bg-emerald-500/10",
  Remotive: "text-sky-700 bg-sky-500/10",
  ProBlogger: "text-orange-700 bg-orange-500/10",
  RemoteCo: "text-purple-700 bg-purple-500/10",
  OnlineJobsPH: "text-yellow-700 bg-yellow-500/10",
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
    PLATFORM_COLORS[opp.sourcePlatform] ?? "text-ink/60 bg-ink/5";
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
      className="flex items-start justify-between group p-3 rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-sm cursor-pointer border border-transparent"
    >
      <div className="flex items-center gap-4 w-full">
        <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center shrink-0 border border-ink/5 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
          <Briefcase className="w-4 h-4 text-ink/30" />
        </div>
        
        <div className="flex-1 transform group-hover:translate-x-1 transition-transform duration-300">
          <div className="flex items-center gap-1.5 flex-wrap pr-4">
            <span className="font-extrabold text-ink/90 text-sm group-hover:text-accent transition-colors leading-tight line-clamp-1">
              {opp.title}
            </span>
          </div>
          
          {opp.company && (
            <div className="text-[10px] font-bold tracking-widest uppercase text-ink/50 mt-0.5 truncate max-w-[200px] sm:max-w-[300px]">
              {opp.company}
            </div>
          )}
          
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${platformColor}`}>
              {opp.sourcePlatform}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-ink/5 text-ink/60 font-black uppercase tracking-wider border border-ink/5">
              {typeLabel}
            </span>
            {postedDate && (
              <span className="text-[9px] font-bold tracking-widest uppercase text-ink/40 ml-1 py-0.5 hidden sm:inline-block">
                {postedDate}
              </span>
            )}
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-2 group-hover:translate-x-0 flex flex-col items-end gap-1 shrink-0">
          <ExternalLink className="w-4 h-4 text-accent" />
        </div>
      </div>
    </a>
  );
}
