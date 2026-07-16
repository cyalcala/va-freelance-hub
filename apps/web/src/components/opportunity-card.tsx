import type { Opportunity } from "@/lib/db";
import { Briefcase, ExternalLink } from "lucide-react";

interface Props {
  opportunity: Opportunity;
}

const PLATFORM_COLORS: Record<string, string> = {
  WeWorkRemotely: "text-emerald-700 bg-emerald-500/[0.08]",
  Remotive: "text-sky-700 bg-sky-500/[0.08]",
  Jobicy: "text-cyan-700 bg-cyan-500/[0.08]",
  RealWorkFromAnywhere: "text-indigo-700 bg-indigo-500/[0.08]",
  RemoteOK: "text-violet-700 bg-violet-500/[0.08]",
  ProBlogger: "text-orange-700 bg-orange-500/[0.08]",
  RemoteCo: "text-violet-700 bg-violet-500/[0.08]",
  OnlineJobsPH: "text-yellow-700 bg-yellow-500/[0.08]",
};

const PLATFORM_LABELS: Record<string, string> = {
  WeWorkRemotely: "We Work Remotely",
  RealWorkFromAnywhere: "Real Work From Anywhere",
  RemoteOK: "Remote OK",
};

const TYPE_LABELS: Record<string, string> = {
  VA: "VA",
  freelance: "Freelance",
  project: "Project",
  "full-time": "Full-time",
  "part-time": "Part-time",
};

function formatDate(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  } catch (e) {
    return null;
  }
}

export function OpportunityCard({ opportunity: opp }: Props) {
  const platformColor =
    PLATFORM_COLORS[opp.sourcePlatform] ?? "text-ink/60 bg-ink/5";
  const platformLabel = PLATFORM_LABELS[opp.sourcePlatform] ?? opp.sourcePlatform;
  const typeLabel = TYPE_LABELS[opp.type] ?? opp.type;
  const postedDate = formatDate(opp.postedAt);
  const isRemoteOk = opp.sourcePlatform === "RemoteOK";
  const href = isRemoteOk
    ? opp.sourceUrl
    : `/api/click/${opp.id}?url=${encodeURIComponent(opp.sourceUrl)}`;
  const rel = isRemoteOk ? "noopener" : "noopener noreferrer";

  let hostname = "";
  try {
    hostname = new URL(opp.sourceUrl).hostname;
  } catch (e) {
    hostname = "";
  }

  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className="group flex items-center gap-3.5 p-3 rounded-xl transition-colors duration-200 hover:bg-ink/[0.035] active:bg-ink/[0.06]"
    >
      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-ink/[0.08] overflow-hidden">
        {hostname ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
            alt=""
            aria-hidden="true"
            className="w-5 h-5 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <Briefcase className={`w-4 h-4 text-ink/30 ${hostname ? 'hidden' : ''}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink text-[15px] group-hover:text-accent transition-colors leading-snug line-clamp-1">
            {opp.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-[13px] text-ink/50 min-w-0">
          {opp.company && <span className="truncate">{opp.company}</span>}
          {opp.company && postedDate && <span className="text-ink/25">·</span>}
          {postedDate && <span className="shrink-0 text-ink/40">{postedDate}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${platformColor}`}>
            {platformLabel}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-ink/[0.05] text-ink/55 font-semibold">
            {typeLabel}
          </span>
          {opp.experienceLevel && opp.experienceLevel !== 'any' && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-soft text-accent font-semibold capitalize">
              {opp.experienceLevel}
            </span>
          )}
        </div>
      </div>

      <ExternalLink className="w-4 h-4 text-ink/25 group-hover:text-accent transition-colors shrink-0 self-start mt-1" />
    </a>
  );
}
