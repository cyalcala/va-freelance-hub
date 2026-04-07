import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

/**
 * V12 SIFTER: Supabase "Chopping Board" Client
 * 
 * This client manages the RAW data staging area. 
 * High-speed ingestion (Cloudflare) -> Supabase -> AI Processing (Inngest/Trigger).
 */

export type HarvestStatus = 'LEAD' | 'RAW' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'PLATED';
export type TriageStatus = 'PENDING' | 'PASSED' | 'REJECTED';

export interface RawJobHarvest {
  id: string;
  source_url: string;
  raw_payload: string;
  source_platform: string;
  status: HarvestStatus;
  triage_status: TriageStatus;
  locked_by: string | null;
  error_log: string | null;
  created_at: string;
  updated_at: string;
}

export interface AICooldown {
  provider_name: string;
  is_blocked: boolean;
  retry_at: string | null;
  error_count: number;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[va-hub/supabase] 🟡 WARNING: Supabase credentials missing during initialization.');
  if (process.env.NODE_ENV === 'production') {
    console.error('[va-hub/supabase] 🔴 CRITICAL: Missing Supabase credentials.');
  }
} else {
  console.log(`[va-hub/supabase] 🟢 Initializing client for: ${supabaseUrl.substring(0, 15)}...`);
}

// Service role client to bypass RLS for background workers
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
  }
);

/**
 * UTILITY: Atomic Job Pickup
 * Prevents multiple workers from grabbing the same RAW job.
 */
export async function claimRawJob(workerId: string, limit: number = 15): Promise<RawJobHarvest[]> {
  // 1. Fetch RAW or LEAD jobs that aren't locked
  const { data, error } = await supabase
    .from('raw_job_harvests')
    .select('*')
    .or('status.eq.RAW,status.eq.LEAD') // Unified Queue
    .is('locked_by', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data || data.length === 0) return [];

  const ids = data.map(job => job.id);

  // 2. Atomic Lock
  const { data: lockedData, error: lockError } = await supabase
    .from('raw_job_harvests')
    .update({ 
      status: 'PROCESSING', 
      locked_by: workerId,
      updated_at: new Date().toISOString() 
    })
    .in('id', ids)
    .select();

  if (lockError) {
    console.error(`[va-hub/supabase] 🔴 FAILED to lock jobs:`, lockError);
    return [];
  }

  return lockedData as RawJobHarvest[];
}

/**
 * UTILITY: Get Global AI Status
 * Returns the current blocklist of providers to avoid $0-cost rate-limit waste.
 */
export async function getAIStatus(): Promise<AICooldown[]> {
  const { data, error } = await supabase
    .from('ai_cooldowns')
    .select('*');
  
  if (error || !data) return [];
  return data as AICooldown[];
}

/**
 * UTILITY: Report AI Cooldown
 * Marks a provider as blocked after a 429 or repeated failure.
 */
export async function reportAICooldown(provider: string, errorMsg: string) {
  const isRateLimit = errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit');
  
  await supabase
    .from('ai_cooldowns')
    .update({ 
      is_blocked: isRateLimit, 
      last_error: errorMsg,
      updated_at: new Date().toISOString()
    })
    .eq('provider_name', provider);
}
