import { supabase, claimRawJob } from '../packages/db/supabase';
import { AIMesh } from '../packages/ai/ai-mesh';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

/**
 * V12 SIFTER: THE MAJOR AUDIT SIMULATOR
 * 
 * Role: 
 * 1. Inject a Mock RAW job into Supabase.
 * 2. Simulate the Inngest Chef's 'Claim' and 'AI Triage/Extract'.
 * 3. Verify the final object is Gold-Vault ready.
 */

const MOCK_HTML = `
<html>
  <body>
    <h1>Lead Software Engineer (Remote)</h1>
    <p>Company: CloudScale Tech</p>
    <p>Location: Worldwide (PH Friendly)</p>
    <p>Salary: $80,000 - $120,000 USD / Year</p>
    <p>We are looking for a Senior Go/React dev. Experience with Kubernetes a plus.</p>
  </body>
</html>
`;

async function runMajorAudit() {
  console.log('🚀 [AUDIT] Starting V12 Full-Cycle Simulation...');
  const simulationId = `audit-${Date.now()}`;

  try {
    // 1. STRIKE 1: THE INJECTION (Mock Scrape)
    console.log('🍽️ [AUDIT] Step 1: Injecting mock RAW job into Pantry...');
    const { data: injected, error: injectError } = await supabase
      .from('raw_job_harvests')
      .insert({
        source_url: `https://example.com/audit-test-job-${Date.now()}`,
        raw_payload: MOCK_HTML,
        source_platform: 'Audit Simulator',
        status: 'RAW',
        locked_by: null
      })
      .select()
      .single();

    if (injectError) throw new Error(`Injection Failed: ${injectError.message}`);
    console.log('✅ [AUDIT] Mock job injected successfully.');

    // 2. STRIKE 3: THE CLAIM (Inngest Logic)
    console.log('🍽️ [AUDIT] Step 2: Simulating Inngest Chef "Claim"...');
    const jobs = await claimRawJob(simulationId, 1);
    if (jobs.length === 0) throw new Error('Chef failed to claim the mock job (Atomic lock failure).');
    const job = jobs[0];
    console.log(`✅ [AUDIT] Chef claimed job ID: ${job.id}`);

    // 3. STRIKE 2: THE BRAIN (AI Mesh Logic)
    console.log('🍽️ [AUDIT] Step 3: Pumping through AI Intelligence Mesh...');
    
    // A. Triage
    const triageStart = Date.now();
    const triage = await AIMesh.triage(job.raw_payload);
    console.log(`🧠 [AUDIT] Triage Decision: ${triage} (${Date.now() - triageStart}ms)`);

    if (triage === 'REJECTED') throw new Error('AI Mesh rejected a valid job! Check Mesh logic.');

    // B. Extraction
    const extractStart = Date.now();
    const extraction = await AIMesh.extract(job.raw_payload);
    console.log(`🧠 [AUDIT] Extraction Successful (${Date.now() - extractStart}ms)`);
    console.log('🔍 [AUDIT] Extraction Payload:', JSON.stringify(extraction, null, 2));

    // 4. STRIKE 4: THE PLATING (Turso Sync Logic)
    console.log('🍽️ [AUDIT] Step 4: Verifying Gold-Vault Compatibility...');
    if (extraction.tier > 3) throw new Error(`Extracted Tier ${extraction.tier} is too low for quality vault.`);
    if (!extraction.isPhCompatible) throw new Error('Extraction failed PH compatibility check.');

    // Final Update (Mark as PROCESSED)
    await supabase
      .from('raw_job_harvests')
      .update({ status: 'PROCESSED', triage_status: 'PASSED' })
      .eq('id', job.id);

    console.log('🌟 [AUDIT] MISSION SUCCESS: V12 Kitchen Brigade is 100% Operational.');
    process.exit(0);

  } catch (err: any) {
    console.error('🔴 [AUDIT] MISSION FAILURE:', err.message);
    process.exit(1);
  }
}

runMajorAudit();
