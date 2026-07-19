// Deterministic geo-eligibility gate (geo masterplan L1, 2026-07).
//
// Runs BEFORE any AI triage. Uses only signals we already hold — the source's
// structured location string, the source's tags, and the job text — to decide
// whether a "remote" listing is genuinely open to Filipino applicants.
//
// Design rules (see docs/geo-eligibility-masterplan-2026-07.md):
// - PH/APAC positives are checked FIRST: "for our Philippines team, must
//   reside in the Philippines" must be eligible, not tripped by the
//   residence-lock pattern.
// - Timezone-OVERLAP requirements ("must overlap 4h with EST") stay eligible —
//   that is normal VA reality. Only hard residence/authorization locks reject.
// - onsite/hybrid markers only count in the title and location string, never
//   in free description text ("we use a hybrid of async and sync" is fine).
// - When signals conflict or are absent the verdict is `unknown` and the AI
//   layer decides. This gate must be precise, not clever.

export type GeoScope =
  | "worldwide"
  | "apac_incl_ph"
  | "ph_only"
  | "region_excl_ph"
  | "country_locked"
  | "unknown";

export type PhEligibility =
  | "eligible_verified"
  | "eligible_likely"
  | "unclear"
  | "ineligible";

export interface GeoGateInput {
  title: string;
  description?: string | null;
  /** Structured location string from the source (RemoteOK `location`, WWR `<region>`, ATS offices). */
  locationRaw?: string | null;
  tags?: string[] | null;
}

export interface GeoVerdict {
  geoScope: GeoScope;
  phEligibility: PhEligibility;
  /** One-line, human-readable reason — persisted and eventually user-visible. */
  evidence: string;
}

// ─── Positive signals ────────────────────────────────────────────────────────

const PH_POSITIVE_REGEX =
  /\b(philippines|philippine|filipino|filipina|manila|cebu|davao|quezon city|makati|taguig|pasig|iloilo|bacolod|baguio|cagayan de oro|ph[- ]based)\b/i;

const APAC_POSITIVE_REGEX =
  /\b(apac|asia[- ]pacific|south[- ]?east asia|southeast asia|asia)\b/i;

const WORLDWIDE_REGEX =
  /\b(anywhere in the world|worldwide|work from anywhere|anywhere|global(?:ly)?[- ]remote|remote[- ]global|100% remote|fully remote|open to all locations|location[- ]independent|probably worldwide)\b/i;

// ─── Negative signals ────────────────────────────────────────────────────────

// Countries and territories that, when named as THE location, mean the job is
// pinned there. (Philippines/APAC handled by the positive pass first.)
const COUNTRY_TOKENS = [
  "united states", "usa", "u\\.s\\.a?\\.", "america",
  "canada", "united kingdom", "uk", "england", "scotland", "wales", "ireland",
  "germany", "deutschland", "france", "spain", "españa", "italy", "italia",
  "switzerland", "austria", "netherlands", "belgium", "luxembourg",
  "portugal", "poland", "czechia", "czech republic", "romania", "hungary",
  "sweden", "norway", "denmark", "finland", "iceland", "estonia", "latvia",
  "lithuania", "greece", "croatia", "bulgaria", "slovakia", "slovenia",
  "ukraine", "türkiye", "turkey", "israel", "uae", "dubai", "saudi arabia",
  "qatar", "egypt", "south africa", "nigeria", "kenya", "ghana", "morocco",
  "brazil", "brasil", "mexico", "méxico", "argentina", "colombia", "chile",
  "peru", "perú", "uruguay", "ecuador", "costa rica", "panama",
  "australia", "new zealand", "japan", "south korea", "korea", "china",
  "hong kong", "taiwan", "singapore", "malaysia", "thailand", "vietnam",
  "indonesia", "india", "pakistan", "bangladesh", "sri lanka", "nepal",
];

// US states — a state name as the location means US-pinned.
const US_STATE_TOKENS = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
  "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey",
  "new mexico", "new york", "north carolina", "north dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
  "south dakota", "tennessee", "texas", "utah", "vermont", "virginia",
  "washington", "west virginia", "wisconsin", "wyoming",
  "district of columbia",
];

// Cities that frequently anchor "remote (city)" listings.
const CITY_TOKENS = [
  "london", "berlin", "munich", "hamburg", "frankfurt", "paris", "lyon",
  "madrid", "barcelona", "milan", "rome", "lugano", "zurich", "zürich",
  "geneva", "bern", "vienna", "amsterdam", "rotterdam", "brussels",
  "lisbon", "porto", "warsaw", "krakow", "prague", "budapest", "bucharest",
  "dublin", "stockholm", "oslo", "copenhagen", "helsinki", "athens",
  "toronto", "vancouver", "montreal", "ottawa", "sydney", "melbourne",
  "brisbane", "auckland", "wellington", "tokyo", "seoul", "tel aviv",
  "new york city", "san francisco", "los angeles", "seattle", "boston",
  "chicago", "houston", "austin", "dallas", "denver", "miami", "atlanta",
  "philadelphia", "phoenix", "portland", "san diego", "nashville",
];

// Regions that exclude the Philippines when named as the eligibility area.
const REGION_EXCL_PH_REGEX =
  /\b(emea|europe|european union|eu only|eea|latam|latin america|north america|americas|middle east|africa|nordics|dach|benelux|oceania|anz)\b/i;

// Hard residence / authorization locks (checked AFTER PH positives).
const RESIDENCE_LOCK_REGEX = new RegExp(
  "\\b(" +
  [
    "must (?:be )?(?:based|located|residing|reside|live|living) in(?: the)? [a-zà-ÿ]",
    "based in(?: the)? (?:us|usa|uk|eu|europe|canada|australia)\\b",
    "residents? (?:of|only)",
    "citizens? (?:of|only)",
    "citizenship (?:is )?required",
    "(?:us|uk|eu|canadian|australian) work (?:authorization|authorisation|permit)",
    "authorized to work in",
    "authorised to work in",
    "eligible to work in(?: the)? (?:us|usa|uk|eu|europe|canada|australia)",
    "work permit (?:for|in|required)",
    "valid (?:us|uk|eu) work",
    "local(?:ly)? (?:candidates|applicants) only",
    "(?:us|uk|eu|canada|australia)[- ]only",
    "only (?:us|uk|eu|canadian|australian) (?:candidates|applicants|residents)",
  ].join("|") +
  ")",
  "i",
);

// Onsite/hybrid — TITLE and LOCATION string only (never free description).
const ONSITE_TITLE_REGEX = /\b(on[- ]?site|in[- ]office|hybrid)\b/i;

// Language-name tags from sources (RemoteOK tags the posting language).
const LANGUAGE_TAGS = new Set([
  "italian", "german", "french", "spanish", "portuguese", "dutch", "polish",
  "swedish", "norwegian", "danish", "finnish", "czech", "hungarian",
  "romanian", "turkish", "japanese", "korean", "mandarin", "cantonese",
]);

// ─── Lightweight language detection (stopword frequency) ─────────────────────
// No dependencies; tuned for 100–1500-char job text. A language wins when it
// clearly out-scores English — short ambiguous text stays "en" (fail-safe).

const LANG_STOPWORDS: Record<string, string[]> = {
  it: ["di", "il", "la", "che", "per", "con", "del", "della", "delle", "sono", "siamo", "nostro", "nostra", "lavoro", "azienda", "cerchiamo", "ricerca", "requisiti", "esperienza", "gestione", "clienti", "attività", "servizio", "durante", "essere", "presso"],
  de: ["der", "die", "das", "und", "für", "mit", "wir", "sie", "bei", "eine", "einen", "einem", "unser", "unsere", "arbeit", "erfahrung", "kenntnisse", "aufgaben", "unternehmen", "suchen", "bewerbung", "sowie", "oder", "nicht", "werden"],
  fr: ["le", "les", "des", "une", "et", "pour", "avec", "nous", "vous", "notre", "dans", "poste", "entreprise", "expérience", "recherche", "mission", "gestion", "clients", "être", "vos", "nos", "chez", "afin", "ainsi"],
  es: ["el", "los", "las", "una", "para", "con", "que", "nuestro", "nuestra", "empresa", "trabajo", "experiencia", "buscamos", "gestión", "clientes", "servicio", "requisitos", "estamos", "sobre", "como", "más", "años"],
  pt: ["os", "as", "um", "uma", "para", "com", "que", "nosso", "nossa", "empresa", "trabalho", "experiência", "buscamos", "gestão", "clientes", "serviço", "você", "são", "não", "mais", "anos"],
  nl: ["de", "het", "een", "en", "voor", "met", "wij", "bij", "ons", "onze", "werk", "ervaring", "bedrijf", "zoeken", "klanten", "jouw", "je", "niet", "zijn", "worden"],
  pl: ["się", "jest", "praca", "firma", "doświadczenie", "klientów", "zespołu", "oferujemy", "wymagania", "oraz", "dla", "nie", "być", "pracy", "których"],
};

const EN_STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "our", "are", "will", "have", "this",
  "that", "from", "your", "work", "team", "role", "experience", "skills",
  "we", "to", "of", "in", "is", "on", "as", "be", "an",
]);

/** Returns a language code ("it", "de", …) when the text is clearly not English, else "en". */
export function detectDominantLanguage(text: string): string {
  const words = text.toLowerCase().split(/[^a-zà-ÿœßąćęłńóśźż]+/).filter(Boolean);
  if (words.length < 8) return "en"; // too short to judge — fail safe

  let enHits = 0;
  for (const w of words) if (EN_STOPWORDS.has(w)) enHits++;

  let bestLang = "en";
  let bestHits = 0;
  for (const [lang, stops] of Object.entries(LANG_STOPWORDS)) {
    const set = new Set(stops);
    let hits = 0;
    const distinct = new Set<string>();
    for (const w of words) {
      if (set.has(w)) {
        hits++;
        distinct.add(w);
      }
    }
    // Require breadth (≥4 distinct stopwords) and volume (≥6 hits) so a
    // stray loanword can't flip a verdict.
    if (distinct.size >= 4 && hits >= 6 && hits > bestHits) {
      bestHits = hits;
      bestLang = lang;
    }
  }

  if (bestLang === "en") return "en";
  // English must clearly lose, not merely tie — bilingual postings that are
  // mostly English stay eligible.
  return bestHits > enHits * 1.5 ? bestLang : "en";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COUNTRY_REGEX = new RegExp(`\\b(${COUNTRY_TOKENS.join("|")})\\b`, "i");
const US_STATE_REGEX = new RegExp(`\\b(${US_STATE_TOKENS.join("|")})\\b`, "i");
const CITY_REGEX = new RegExp(`\\b(${CITY_TOKENS.join("|")})\\b`, "i");

function firstMatch(regex: RegExp, text: string): string | null {
  const m = regex.exec(text);
  return m ? m[1] ?? m[0] : null;
}

function verdict(geoScope: GeoScope, phEligibility: PhEligibility, evidence: string): GeoVerdict {
  return { geoScope, phEligibility, evidence };
}

// ─── The gate ────────────────────────────────────────────────────────────────

export function geoGate(input: GeoGateInput): GeoVerdict {
  const title = (input.title || "").trim();
  const description = (input.description || "").slice(0, 1500);
  const locationRaw = (input.locationRaw || "").trim();
  const tags = (input.tags || []).map((t) => String(t).toLowerCase().trim());
  const titleAndDesc = `${title} ${description}`;

  // 1. PH positives win first — a job naming the Philippines is exactly what
  //    the board exists for, even when phrased as a residence requirement.
  const phInLocation = firstMatch(PH_POSITIVE_REGEX, locationRaw);
  const phInText = firstMatch(PH_POSITIVE_REGEX, titleAndDesc);
  if (phInLocation || phInText) {
    const where = phInLocation ? `location "${locationRaw}"` : `text mention "${phInText}"`;
    // Location says ONLY the Philippines → exclusive tier.
    if (phInLocation && !COUNTRY_REGEX.test(locationRaw) && !US_STATE_REGEX.test(locationRaw)) {
      return verdict("ph_only", "eligible_verified", `Philippines-targeted: ${where}`);
    }
    return verdict("apac_incl_ph", "eligible_verified", `Philippines named: ${where}`);
  }
  const apacHit = firstMatch(APAC_POSITIVE_REGEX, locationRaw) ?? firstMatch(APAC_POSITIVE_REGEX, title);
  if (apacHit) {
    return verdict("apac_incl_ph", "eligible_verified", `APAC region named: "${apacHit}"`);
  }

  // 2. Non-English posting → targets a domestic market, not PH applicants.
  const lang = detectDominantLanguage(titleAndDesc);
  if (lang !== "en") {
    return verdict("country_locked", "ineligible", `Non-English posting (detected: ${lang})`);
  }

  // 3. Source language tags without an accompanying "english".
  const langTag = tags.find((t) => LANGUAGE_TAGS.has(t));
  if (langTag && !tags.includes("english")) {
    return verdict("country_locked", "ineligible", `Source tagged language: "${langTag}"`);
  }

  // 4. Structured location string → the most authoritative signal we hold.
  if (locationRaw) {
    if (WORLDWIDE_REGEX.test(locationRaw)) {
      return verdict("worldwide", "eligible_likely", `Location listed: "${locationRaw}"`);
    }
    const regionExcl = firstMatch(REGION_EXCL_PH_REGEX, locationRaw);
    if (regionExcl) {
      return verdict("region_excl_ph", "ineligible", `Region excludes PH: "${regionExcl}" in "${locationRaw}"`);
    }
    const place =
      firstMatch(US_STATE_REGEX, locationRaw) ??
      firstMatch(COUNTRY_REGEX, locationRaw) ??
      firstMatch(CITY_REGEX, locationRaw);
    if (place) {
      return verdict("country_locked", "ineligible", `Location pinned: "${place}" in "${locationRaw}"`);
    }
  }

  // 5. Title-level pins: "(US)", "- London", onsite/hybrid markers.
  if (ONSITE_TITLE_REGEX.test(title) || (locationRaw && ONSITE_TITLE_REGEX.test(locationRaw))) {
    const marker = firstMatch(ONSITE_TITLE_REGEX, title) ?? firstMatch(ONSITE_TITLE_REGEX, locationRaw);
    return verdict("country_locked", "ineligible", `Not fully remote: "${marker}" marker`);
  }
  const titlePlace = firstMatch(US_STATE_REGEX, title) ?? firstMatch(CITY_REGEX, title);
  if (titlePlace) {
    return verdict("country_locked", "ineligible", `Title names location: "${titlePlace}"`);
  }

  // 6. Hard residence / work-authorization locks in the text.
  const lock = firstMatch(RESIDENCE_LOCK_REGEX, titleAndDesc);
  if (lock) {
    return verdict("region_excl_ph", "ineligible", `Residence/authorization lock: "${lock.slice(0, 60)}"`);
  }

  // 7. Explicit worldwide language in the text.
  if (WORLDWIDE_REGEX.test(titleAndDesc)) {
    return verdict("worldwide", "eligible_likely", "Worldwide/anywhere language in posting");
  }

  // 8. No deterministic signal — the AI layer decides.
  return verdict("unknown", "unclear", "No deterministic geo signal");
}
