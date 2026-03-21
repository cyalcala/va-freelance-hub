/**
 * Intelligent Job Sifter (JS Version)
 * Categorizes and filters jobs before they reach the database.
 */
import { config } from "@va-hub/config";

export enum OpportunityTier {
  GOLD = 1,      // PH-focused / High-Accessibility
  SILVER = 2,    // Global Remote / Entry
  BRONZE = 3,    // General
  TRASH = 4      // Regional-locked / Ultra-Senior Tech / Non-English
}

const TECH_KILLS = config.kill_lists.titles;   // Simplified for now
const REGIONAL_KILLS = config.kill_lists.content;
const SEA_SIGNALS = config.target_signals.region;
const REMOTE_SIGNALS = config.target_signals.remote;
const ROLE_SIGNALS = config.target_signals.role;

export function siftOpportunity(title: string, company: string, description: string, sourcePlatform?: string): OpportunityTier {
  const t = (title || "").toLowerCase();
  const c = (company || "").toLowerCase();
  const d = (description || "").toLowerCase();
  const s = (sourcePlatform || "").toLowerCase();
  const body = `${t} ${c} ${d} ${s}`;

  // 1. Target Categories
  const isTargetCategory = ROLE_SIGNALS.some(sig => t.includes(sig));

  // 2. Hard Tech & Company Kill
  if (TECH_KILLS.some(tk => t.includes(tk)) && !t.includes("support")) return OpportunityTier.TRASH;
  if (config.kill_lists.companies.some(ck => c.includes(ck))) return OpportunityTier.TRASH;

  // 3. Absolute Leadership & Non-Accessible Kill (C-Suite/Global Exec/Ultra-Senior)
  const cSuite = ["ceo", "cto", "vp", "vice president", "director", "president", "head of", "principal", "staff", "researcher", "lead engineer", "senior engineer"];
  if (cSuite.some(l => t.includes(l))) return OpportunityTier.TRASH;

  // 4. Regional Kill
  if (REGIONAL_KILLS.some(k => body.includes(k) && !SEA_SIGNALS.some(sea => body.includes(sea)) && !REMOTE_SIGNALS.some(r => body.includes(r)))) return OpportunityTier.TRASH;

  // 4. Regional Kill
  if (REGIONAL_KILLS.some(k => body.includes(k) && !SEA_SIGNALS.some(sea => body.includes(sea)) && !REMOTE_SIGNALS.some(r => body.includes(r)))) return OpportunityTier.TRASH;

  // 5. Tiering with Contextual Demotion
  const phSignals = ["philippines", "filipino", "pinoy", "tagalog", "manila", "cebu", "ph", "pampanga", "davao"];
  const hasPhSignal = phSignals.some(sig => body.includes(sig));
  const hasSeaSignal = SEA_SIGNALS.some(sea => body.includes(sea));
  const hasRemoteSignal = REMOTE_SIGNALS.some(r => body.includes(r));
  const phFocusedSource = ["reddit", "onlinejobs", "direct", "manual", "pinoy", "filipino", "vajobsph"];
  
  const isPhContext = hasPhSignal || phFocusedSource.some(src => s.includes(src));
  const isSpecialistRole = ["senior", "manager", "lead", "specialist"].some(l => t.includes(l));
  
  if (isTargetCategory && (isPhContext || hasSeaSignal || hasRemoteSignal)) {
    if (isPhContext && !isSpecialistRole) return OpportunityTier.GOLD;
    return OpportunityTier.SILVER;
  }

  // Final Bronze Fallback: If it's remote but not a target category (and not trashed by tech kills)
  if (hasRemoteSignal) return OpportunityTier.BRONZE;

  return OpportunityTier.TRASH;
}



