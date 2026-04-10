import { supabase } from "../packages/db/supabase";

async function injectBPO() {
  const leads = [
    { title: "Hiring CSR", url: "https://www.reddit.com/r/VAjobsPH/comments/1izv64j/hiring_csr/" },
    { title: "[HIRING] Healthcare CSR for local healthcare account (WOS)", url: "https://www.reddit.com/r/VAjobsPH/comments/1iyu8is/hiring_healthcare_csr_for_local_healthcare/" },
    { title: "[HIRING] Content Moderator in Ortigas and CSR in McKinley Hill, Taguig", url: "https://www.reddit.com/r/VAjobsPH/comments/1ixn3cl/hiring_content_moderator_in_ortigas_and_csr_in/" }
  ];

  const data = leads.map(l => ({
    source_url: l.url,
    raw_payload: `||V12_GHOST_LEAD|| ${l.title}`,
    source_platform: "Reddit: BPO_INJECT",
    status: "RAW",
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('raw_job_harvests').upsert(data, { onConflict: 'source_url' });
  if (error) console.error("❌ Injection failed:", error.message);
  else console.log("✅ [INJECTED] 3 BPO leads into Pantry.");
}

injectBPO();
