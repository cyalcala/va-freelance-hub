import type { VADirectoryEntry } from "@/lib/db";

interface Props {
  entry: VADirectoryEntry;
}

const NICHE_COLORS: Record<string, string> = {
  admin: "text-blue-400 bg-blue-400/10",
  creative: "text-pink-400 bg-pink-400/10",
  tech: "text-cyan-400 bg-cyan-400/10",
  "social-media": "text-purple-400 bg-purple-400/10",
  "customer-support": "text-orange-400 bg-orange-400/10",
  finance: "text-emerald-400 bg-emerald-400/10",
  other: "text-zinc-400 bg-zinc-400/10",
};

export function DirectoryCard({ entry }: Props) {
  const nicheColor = NICHE_COLORS[entry.niche ?? "other"] ?? NICHE_COLORS.other;

  return (
    <div className="border border-border rounded-xl p-4 bg-surface hover:border-zinc-600 transition-colors flex flex-col gap-3">
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full capitalize ${nicheColor}`}>
          {entry.niche ?? "other"}
        </span>
        {entry.hiresFilipinosf && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full text-yellow-400 bg-yellow-400/10">
            🇵🇭 Hires Filipinos
          </span>
        )}
      </div>

      {/* Company name */}
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-zinc-100">{entry.companyName}</h3>
        {entry.notes && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{entry.notes}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        {entry.verifiedAt && (
          <span className="text-[10px] font-mono text-zinc-600">
            verified {new Date(entry.verifiedAt).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
          </span>
        )}
        {entry.hiringPageUrl && (
          <a
            href={entry.hiringPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-accent hover:text-accent-hover transition-colors font-medium"
          >
            Hiring page →
          </a>
        )}
      </div>
    </div>
  );
}
