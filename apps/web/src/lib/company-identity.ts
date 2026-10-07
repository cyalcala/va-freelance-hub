import type { PublicDirectoryRow } from './public-board';
import { directoryLogoDomain, normalizeDirectoryUrl } from './directory-card';

const identityKey = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
// Hosted careers and social profiles identify their provider, not the employer's mark.
const providerDomains = ['workable.com', 'greenhouse.io', 'lever.co', 'myworkdayjobs.com',
  'smartrecruiters.com', 'ashbyhq.com', 'bamboohr.com', 'recruitee.com', 'teamtailor.com',
  'applytojob.com', 'jobvite.com', 'icims.com', 'breezy.hr', 'jazz.co',
  'facebook.com', 'fb.com', 'linkedin.com', 'instagram.com', 'twitter.com', 'x.com',
  'youtube.com', 'tiktok.com', 'linktr.ee', 'beacons.ai', 'github.com', 'notion.site'];

export function employerLogoDomain(domain: string | null): string | null {
  const normalized = domain?.toLowerCase().replace(/\.+$/, '') ?? '';
  if (!normalized || providerDomains.some((provider) => normalized === provider || normalized.endsWith(`.${provider}`))) return null;
  return normalized;
}

/** Exact recorded employer identities only. Conflicting websites remain unknown. */
export function companyLogoDomains(rows: readonly PublicDirectoryRow[]): Map<string, string | null> {
  const domains = new Map<string, string | null>();
  for (const row of rows) {
    const key = identityKey(row.companyName);
    const domain = employerLogoDomain(directoryLogoDomain(normalizeDirectoryUrl(row.website))?.replace(/^www\./, '') ?? null);
    if (!key || !domain) continue;
    if (!domains.has(key)) domains.set(key, domain);
    else if (domains.get(key) !== domain) domains.set(key, null);
  }
  return domains;
}

export function withCompanyLogo<T extends { company: string | null }>(job: T, domains: ReadonlyMap<string, string | null>): T & { logoDomain: string | null } {
  return { ...job, logoDomain: job.company ? domains.get(identityKey(job.company)) ?? null : null };
}
