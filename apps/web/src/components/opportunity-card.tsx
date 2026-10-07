import type { Opportunity } from "@/lib/db";
import { ChevronRight, ExternalLink } from "lucide-react";

export type OpportunityCardData = Pick<
  Opportunity,
  | "id"
  | "title"
  | "company"
  | "type"
  | "sourceUrl"
  | "sourcePlatform"
  | "postedAt"
  | "experienceLevel"
  | "geoScope"
  | "phEligibility"
  | "geoEvidence"
> & {
  /** First-seen instant. Optional so slim projections (e.g. homepage) keep
   * compiling; carried for recency filtering, not displayed. */
  scrapedAt?: string | null;
  /** Recorded directory identity, never a guessed source-platform host. */
  logoDomain?: string | null;
};

interface Props {
  opportunity: OpportunityCardData;
}

const PLATFORM_LABELS: Record<string, string> = {
  WeWorkRemotely: "We Work Remotely",
  RealWorkFromAnywhere: "Real Work From Anywhere",
  RemoteOK: "Remote OK",
  "Greenhouse/canonical": "Canonical",
};

const TYPE_LABELS: Record<string, string> = {
  VA: "VA",
  freelance: "Freelance",
  project: "Project",
  "full-time": "Full-time",
  "part-time": "Part-time",
};

// Only positive recorded scopes appear. Likely eligibility keeps its qualifier;
// source evidence is supplemental and never implies a new employer check.
const GEO_LABELS: Record<string, string> = {
  ph_only: "Philippines",
  apac_incl_ph: "APAC incl. PH",
  worldwide: "Worldwide",
};

const MANILA_TZ = "Asia/Manila";

const manilaDayMonth = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TZ,
  month: "short",
  day: "numeric",
});

/** Source posted date, rendered on the Manila calendar so morning checks match. */
function formatDate(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return manilaDayMonth.format(d);
  } catch (e) {
    return null;
  }
}

export function OpportunityCard({ opportunity: opp }: Props) {
  const platformLabel = PLATFORM_LABELS[opp.sourcePlatform] ?? opp.sourcePlatform;
  const typeLabel = TYPE_LABELS[opp.type] ?? opp.type;
  const postedDate = formatDate(opp.postedAt);
  const hasDetailPage =
    opp.phEligibility === "eligible_verified" ||
    opp.phEligibility === "eligible_likely";

  const isRemoteOk = opp.sourcePlatform === "RemoteOK";
  const externalHref = isRemoteOk
    ? opp.sourceUrl
    : `/api/click/${opp.id}?url=${encodeURIComponent(opp.sourceUrl)}`;

  const href = hasDetailPage ? `/jobs/${opp.id}` : externalHref;
  const target = hasDetailPage ? undefined : "_blank";
  const rel = hasDetailPage ? undefined : isRemoteOk ? "noopener" : "noopener noreferrer";
  const companyWords = (opp.company ?? '').trim().split(/\s+/).filter(Boolean);
  const initials = companyWords.length > 1
    ? `${Array.from(companyWords[0])[0]}${Array.from(companyWords[1])[0]}`.toUpperCase()
    : companyWords.length === 1 ? Array.from(companyWords[0]).slice(0, 2).join('').toUpperCase() : '—';
  const geoLabel = hasDetailPage && opp.geoScope ? GEO_LABELS[opp.geoScope] : undefined;
  const isLikely = opp.phEligibility === "eligible_likely";
  const logoUrl = opp.logoDomain
    ? `/api/company-logo?domain=${encodeURIComponent(opp.logoDomain)}&initial=${encodeURIComponent(initials[0] ?? '?')}`
    : null;

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="opportunity-row"
    >
      <span className="opportunity-initials company-mark" aria-hidden="true">
        <span>{initials}</span>
        {logoUrl && <img src={logoUrl} width="40" height="40" alt="" loading="lazy" decoding="async" data-company-logo="" />}
      </span>
      <div className="min-w-0">
        <span className="opportunity-title">{opp.title}</span>
        <div className="opportunity-meta">
          {opp.company && <span className="opportunity-company">{opp.company}</span>}
          <span>{typeLabel}</span>
          {opp.experienceLevel && opp.experienceLevel !== 'any' && (
            <span className="capitalize">
              {opp.experienceLevel}
            </span>
          )}
        </div>
        <p className="opportunity-source">Source: {platformLabel}</p>
      </div>
      <div className="opportunity-facts">
        {geoLabel && <span className={`opportunity-geo${isLikely ? ' opportunity-geo-likely' : ''}`} title={opp.geoEvidence ?? undefined}>
          {geoLabel}{isLikely ? ' · likely' : ''}
        </span>}
        {postedDate && <span className="opportunity-date">Source posted <time dateTime={opp.postedAt!}>{postedDate}</time></span>}
      </div>
      {hasDetailPage ? (
        <ChevronRight className="opportunity-arrow w-4 h-4" aria-hidden="true" />
      ) : (
        <ExternalLink className="opportunity-arrow w-4 h-4" aria-hidden="true" />
      )}
    </a>
  );
}
