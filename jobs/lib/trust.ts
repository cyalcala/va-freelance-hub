/**
 * Anti-Scam & Trust Validation Module
 * 
 * Protects users from common remote work scams, fake listings,
 * and ghost jobs by enforcing linguistic and behavioral heuristics.
 */

// Common signals of "too good to be true" or direct-contact scams
const SCAM_PATTERNS = [
  /earn \$?\d{3,}\/?(day|week)/i, // "Earn $500/day"
  /easy money/i,
  /telegram me/i,
  /whatsapp me/i,
  /message me on (telegram|whatsapp)/i,
  /no experience required/i, // Often a scam hook when combined with high pay
  /get rich/i,
  /wire transfer/i,
  /crypto trading/i,
  /payment upfront/i,
  /cash app/i,
  /data entry.*\$[3-9]\d\/hr/i, 
  /onlyfans/i,
  /chatter.*onlyfans/i,
  /side hustle/i,
  /earn.*php.*day/i,
  /student looking for/i,
  /ways to earn/i,
  /chat moderator/i,
  /chat moderation/i,
  /of chatter/i,
  /onlyfans chatter/i,
  /account closer/i,
  /chatter.*remote/i,
];

export function isLikelyScam(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  
  // 1. HARD KILL: Direct scam patterns
  if (SCAM_PATTERNS.some(regex => regex.test(text))) {
    return true;
  }

  // 2. CONTEXTUAL RISK SCORING (The "Poisoned Hook" Sensor)
  let riskScore = 0;
  
  // High-Risk Communication Channels
  if (text.includes("telegram")) riskScore += 2;
  if (text.includes("whatsapp")) riskScore += 2;
  if (text.includes("signal app")) riskScore += 2;
  
  // Linguistic Red Flags (Scam "Politeness")
  if (text.includes("kindly")) riskScore += 1;
  if (text.includes("urgent hiring no interview")) riskScore += 4;
  if (text.includes("salary will be paid via check")) riskScore += 5;
  if (text.includes("buy equipment")) riskScore += 5;
  if (text.includes("fee required")) riskScore += 5;
  
  // Contextual mismatch: "High Pay" + "No Experience"
  const hasHighPaySignal = text.includes("high pay") || text.includes("$50/hr") || text.includes("$100/hr");
  const hasNoExperienceSignal = text.includes("no experience") || text.includes("freshers");
  if (hasHighPaySignal && hasNoExperienceSignal) riskScore += 3;
  
  // Niche Scams: OnlyFans Chatter clones
  if (text.includes("chatter") && (text.includes("model") || text.includes("adult"))) riskScore += 4;
  
  return riskScore >= 4;
}

// Words common in Applicant Tracking Systems when a job is closed but the URL still returns 200 OK
const GHOST_JOB_PATTERNS = [
  "job is no longer available",
  "position has been filled",
  "no longer accepting applications",
  "this posting has expired",
  "this role is closed",
  "opportunity is no longer active",
  "404 not found",
  "page not found"
];

export function isGhostJob(htmlContent: string): boolean {
  const text = htmlContent.toLowerCase();
  return GHOST_JOB_PATTERNS.some(pattern => text.includes(pattern));
}
