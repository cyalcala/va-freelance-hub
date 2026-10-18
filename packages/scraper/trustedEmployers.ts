/**
 * Employer discovery and prioritization catalog.
 *
 * These labels are research priors for locating employers' authoritative
 * hiring surfaces. They do not contain dated, source-bound hiring evidence
 * or establish an individual opening's geography or working schedule.
 *
 * Core Constitutional Separation:
 *   Employer PH confidence != Job validity != PH eligibility != Role relevance
 *
 * An employer's verified reputation does NOT bypass:
 *   1. Job validity & existence (real, non-error URL)
 *   2. Freshness window (30-day post/seen window; stale postings reject)
 *   3. Specific geographic locks (e.g. Pineapple Staffing US-only roles reject)
 *   4. Work location requirements (e.g. Affordable Staff Bacolod onsite rejects)
 *   5. Deduplication (same source URL or vacancy identity)
 *
 * Absence of a contradiction is not affirmative PH eligibility. Every opening
 * still needs its own applicable evidence; a catalog name/token match is not
 * collection permission, a publication grant, or a substitute for that evidence.
 */

export type EmployerConfidenceTier = "tier_a_vetted" | "tier_b_known";

export type EmployerEvidenceType =
  | "ph_registered_entity"
  | "ph_specific_careers_page"
  | "vetted_va_agency"
  | "recurring_ph_hiring_history"
  | "official_employer_declaration"
  | "ats_location_metadata";

export interface TrustedEmployerProfile {
  id: string;
  companyName: string;
  aliases: string[];
  /** Discovery confidence label; no dated per-opening authority is implied. */
  confidenceTier: EmployerConfidenceTier;
  evidenceTypes: EmployerEvidenceType[];
  evidenceNotes: string;
  /** Research prior, never an opening verdict. */
  defaultGeoScope: "ph_only" | "apac_incl_ph";
  /** Research prior, never evidence of an opening's schedule. */
  typicalWorkingHours: "day_shift" | "flexible" | "night_shift" | "unknown";
}

export const TRUSTED_PH_EMPLOYERS: Record<string, TrustedEmployerProfile> = {
  "hunt-st": {
    id: "hunt-st",
    companyName: "Hunt St",
    aliases: ["hunt st", "hunt-st", "hunt street", "workable:hunt-st"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history", "ph_specific_careers_page"],
    evidenceNotes: "Dedicated remote VA & offshore recruitment agency explicitly hiring Filipino talent",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "day_shift",
  },
  "coconutva": {
    id: "coconutva",
    companyName: "Coconut VA",
    aliases: ["coconut va", "coconutva", "coconut-va", "workable:coconutva"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history"],
    evidenceNotes: "Established VA business model exclusively sourcing and staffing Filipino virtual assistants",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "flexible",
  },
  "20four7va": {
    id: "20four7va",
    companyName: "20Four7VA",
    aliases: ["20four7va", "20 four 7 va", "2047va", "breezy:20four7va"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history", "ph_registered_entity"],
    evidenceNotes: "Established global VA agency with primary operational remote workforce based in the Philippines",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "flexible",
  },
  "crewbloom": {
    id: "crewbloom",
    companyName: "CrewBloom",
    aliases: ["crewbloom", "crew bloom", "workable:crewbloom"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history"],
    evidenceNotes: "Remote staffing agency with consistent, verified Philippines-specific recruitment",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "flexible",
  },
  "pearltalent": {
    id: "pearltalent",
    companyName: "Pearl Talent",
    aliases: ["pearl talent", "pearltalent", "workable:pearltalent"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history", "ats_location_metadata"],
    evidenceNotes: "Offshore talent agency with established Philippine remote team and recurring PH openings",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "flexible",
  },
  "hammerjack": {
    id: "hammerjack",
    companyName: "Hammerjack",
    aliases: ["hammerjack", "hammer jack"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["ph_registered_entity", "vetted_va_agency", "recurring_ph_hiring_history"],
    evidenceNotes: "Australian-Philippine outsourcing firm offering dayshift Philippine remote roles",
    defaultGeoScope: "apac_incl_ph",
    typicalWorkingHours: "day_shift",
  },
  "multiplymii": {
    id: "multiplymii",
    companyName: "MultiplyMii",
    aliases: ["multiplymii", "multiply mii", "multiply-mii"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history", "ph_specific_careers_page"],
    evidenceNotes: "Remote talent recruitment firm specializing in placing Filipino professionals with global clients",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "day_shift",
  },
  "athena": {
    id: "athena",
    companyName: "Athena",
    aliases: ["athena", "athena va", "athena executive services", "greenhouse:athena"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history"],
    evidenceNotes: "Executive assistant staffing agency built primarily on remote Filipino talent",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "flexible",
  },
  "hello-rache": {
    id: "hello-rache",
    companyName: "Hello Rache",
    aliases: ["hello rache", "hellorache", "hello-rache", "workable:hello-rache"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history"],
    evidenceNotes: "Healthcare virtual assistant agency exclusively hiring Filipino medical professionals",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "flexible",
  },
  "sourcefit": {
    id: "sourcefit",
    companyName: "Sourcefit",
    aliases: ["sourcefit", "source fit", "breezy:sourcefit"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["ph_registered_entity", "vetted_va_agency", "recurring_ph_hiring_history"],
    evidenceNotes: "BPO and virtual staffing firm with registered Philippine operations and remote opportunities",
    defaultGeoScope: "ph_only",
    typicalWorkingHours: "flexible",
  },
  "rocketams": {
    id: "rocketams",
    companyName: "RocketAMS",
    aliases: ["rocketams", "rocket ams", "workable:rocketams"],
    confidenceTier: "tier_a_vetted",
    evidenceTypes: ["vetted_va_agency", "recurring_ph_hiring_history"],
    evidenceNotes: "Australian agency recruiting remote Philippine staff for dayshift APAC roles",
    defaultGeoScope: "apac_incl_ph",
    typicalWorkingHours: "day_shift",
  },
};

function normalizeIdentifier(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^(?:workable|breezy|greenhouse|ashby|lever):/, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Finds a discovery profile by name, token, or alias. Normalization may join
 * identical tokens across providers; this lookup must not authorize eligibility.
 */
export function findTrustedEmployer(identifier: string | null | undefined): TrustedEmployerProfile | null {
  if (!identifier) return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  // Direct key lookup
  if (TRUSTED_PH_EMPLOYERS[trimmed]) {
    return TRUSTED_PH_EMPLOYERS[trimmed];
  }

  const normalized = normalizeIdentifier(trimmed);
  if (!normalized) return null;

  for (const profile of Object.values(TRUSTED_PH_EMPLOYERS)) {
    if (normalizeIdentifier(profile.id) === normalized) {
      return profile;
    }
    if (normalizeIdentifier(profile.companyName) === normalized) {
      return profile;
    }
    for (const alias of profile.aliases) {
      if (normalizeIdentifier(alias) === normalized) {
        return profile;
      }
    }
  }

  return null;
}

/**
 * Returns whether the name/token matches a discovery profile, without granting
 * PH eligibility, schedule certainty, collection permission, or publication.
 */
export function isTrustedPhEmployer(identifier: string | null | undefined): boolean {
  return Boolean(findTrustedEmployer(identifier));
}
