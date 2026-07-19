export const meta = {
  name: 'va-directory-audit',
  description: 'Audit va_directory: resolve dead/moved domains and verify Filipino-hiring reality',
  phases: [
    { title: 'Assess', detail: 'research agents classify companies in batches' },
    { title: 'Verify', detail: 'adversarially double-check every proposed removal' },
  ],
}

const DATA = /*__DATA__*/ [];

const PH_CATEGORIES = [
  'hires_ph_direct',        // VA agency / BPO / company that directly employs Filipino talent (remote or onsite PH)
  'global_remote_incl_ph',  // remote-first employer whose roles are open to PH applicants
  'marketplace',            // freelance platform where Filipinos find clients (Upwork, Fiverr, OnlineJobs) — not an employer
  'job_board',              // aggregator / listing site (Indeed, FlexJobs, Remotive, Remote.co) — not an employer
  'unclear',
  'no_ph',                  // evidence they do NOT hire Filipinos / not relevant to this directory
  'defunct',                // company appears gone
]

const BATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          i: { type: 'number', description: 'the company id from input' },
          name: { type: 'string' },
          existence: { type: 'string', enum: ['live', 'moved', 'defunct', 'no_site_found', 'unknown'] },
          correctedUrl: { type: ['string', 'null'], description: 'the current correct URL if the domain moved or a site was found; else null' },
          phCategory: { type: 'string', enum: PH_CATEGORIES },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          evidence: { type: 'string', description: 'brief, concrete basis for the verdict (e.g. "careers page lists Philippines roles", "domain parked/for-sale", "well-known freelance marketplace")' },
          action: { type: 'string', enum: ['keep', 'update_url', 'recategorize', 'remove', 'review'] },
          note: { type: 'string', description: 'short human-readable recommendation detail' },
        },
        required: ['i', 'name', 'existence', 'correctedUrl', 'phCategory', 'confidence', 'evidence', 'action', 'note'],
      },
    },
  },
  required: ['results'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    i: { type: 'number' },
    confirmRemove: { type: 'boolean', description: 'true ONLY if the company is genuinely defunct/gone with no working replacement site; default false when uncertain' },
    correctedUrl: { type: ['string', 'null'] },
    note: { type: 'string' },
  },
  required: ['i', 'confirmRemove', 'correctedUrl', 'note'],
}

function chunk(arr, n) {
  const out = []
  for (let k = 0; k < arr.length; k += n) out.push(arr.slice(k, k + n))
  return out
}

const LINK_LEGEND = `Link pre-check status codes (already measured for you):
- LIVE: website responded OK.
- ALIVE_BOT_WALL: site is up but returned 403/429 to our bot — it is ALIVE, do not treat as dead.
- ALIVE_CERT: site is up but has a TLS/cert quirk — ALIVE.
- DEAD_DNS: domain does not resolve (likely defunct OR moved to a new domain).
- PARKED: domain resolves to a for-sale/parking page — defunct.
- DEAD_404_ROOT: homepage returns 404 — likely defunct.
- DEAD_404_PATH_ALIVE_ROOT: only a sub-path (e.g. /careers) is gone; the homepage is alive.
- NO_WEBSITE: we have no URL on file for this company.`

function assessPrompt(batch) {
  return `You are a meticulous research analyst auditing a public directory titled "Companies that hire Filipinos" (Filipino virtual assistants, BPO staff, and remote freelancers). For EACH company below, determine (a) whether it still exists / has moved domains, and (b) whether it genuinely hires Filipino talent, and recommend an action.

${LINK_LEGEND}

METHOD:
- For globally well-known entities (e.g. Upwork, Fiverr, Canva, Indeed, TTEC, Nokia, Deel, Remote.com), classify from your own knowledge with high confidence — no search needed. Note that pure job platforms/marketplaces (Upwork, Fiverr, OnlineJobs.ph, Indeed, FlexJobs, Remotive, Remote.co) are NOT employers — categorize them as 'marketplace' or 'job_board' and action 'recategorize' (they can stay in the directory but are mislabeled as hiring companies).
- For DEAD_DNS / PARKED / DEAD_404_ROOT / NO_WEBSITE companies: use WebSearch (and WebFetch if useful) to find whether the company is DEFUNCT or simply MOVED to a new domain. If moved or found, set existence='moved'/'live' and put the current URL in correctedUrl with action 'update_url'. If genuinely gone, existence='defunct', action 'remove'. Reputable Philippine BPOs (e.g. Diversify OSS, Unity Communications) very likely just changed domains — search before concluding defunct.
- For live obscure VA/BPO agencies: the niche field and name are strong signals. If it is clearly a VA agency / BPO / PH-focused staffing firm, phCategory='hires_ph_direct'. You may WebFetch the hiring page to confirm a Philippines mention when uncertain; otherwise judge from available signals with medium confidence.
- Be HONEST about confidence. Never invent a correctedUrl — only provide one you actually found.

ACTION RULES:
- keep: alive and genuinely PH-hiring (or global-remote incl. PH).
- update_url: you found a corrected/current URL (provide correctedUrl).
- recategorize: it's a marketplace/job_board, or miscategorized; keep but relabel (explain in note).
- remove: genuinely defunct/gone with no working site, OR clearly does not hire Filipinos.
- review: genuinely ambiguous — needs a human glance.

COMPANIES (JSON):
${JSON.stringify(batch)}

Return STRICT JSON per the schema: one result object per company, echoing its id as "i".`
}

function verifyPrompt(c) {
  return `You are a skeptical verifier guarding against wrongly deleting a real company from a directory. Another analyst recommended REMOVING this entry as defunct:

${JSON.stringify(c)}

Independently check with WebSearch (and WebFetch if needed): is this company truly gone, with NO working current website under any domain? Companies often just rebrand or move domains — if you find ANY working current site, it should NOT be removed; return confirmRemove=false and put the working URL in correctedUrl. Only return confirmRemove=true if you are confident it is genuinely defunct/shut down. Default to confirmRemove=false when uncertain.`
}

phase('Assess')
const groups = chunk(DATA, 14)
log(`Auditing ${DATA.length} companies across ${groups.length} research batches.`)
const assessed = await parallel(
  groups.map((g, gi) => () =>
    agent(assessPrompt(g), { label: `assess:b${gi + 1}`, phase: 'Assess', schema: BATCH_SCHEMA, agentType: 'general-purpose', effort: 'medium' })
      .then((r) => (r && r.results ? r.results : [])),
  ),
)
const all = assessed.flat().filter(Boolean)
log(`Collected ${all.length} verdicts.`)

phase('Verify')
const removalCandidates = all.filter((x) => x.action === 'remove')
log(`Adversarially verifying ${removalCandidates.length} proposed removals.`)
const verified = await parallel(
  removalCandidates.map((c) => () =>
    agent(verifyPrompt(c), { label: `verify:${c.i}`, phase: 'Verify', schema: VERIFY_SCHEMA, agentType: 'general-purpose', effort: 'medium' })
      .then((v) => (v ? { ...c, confirmRemove: v.confirmRemove, verifyCorrectedUrl: v.correctedUrl, verifyNote: v.note } : { ...c, confirmRemove: false, verifyNote: 'verifier failed; defaulting to keep' })),
  ),
)

const confirmedRemovals = verified.filter((v) => v.confirmRemove === true)
const rescuedFromRemoval = verified.filter((v) => v.confirmRemove !== true)
const urlUpdates = all.filter((x) => x.action === 'update_url' && x.correctedUrl)
const recategorizations = all.filter((x) => x.action === 'recategorize')
const reviews = all.filter((x) => x.action === 'review')
const noPh = all.filter((x) => x.phCategory === 'no_ph')

return {
  totalAssessed: all.length,
  confirmedRemovals,
  rescuedFromRemoval,
  urlUpdates,
  recategorizations,
  reviews,
  noPh,
  all,
}
