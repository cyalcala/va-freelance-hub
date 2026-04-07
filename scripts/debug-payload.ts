import { supabase } from "../packages/db/supabase";
import fs from 'fs';

async function dumpPayload() {
  const { data } = await supabase
    .from('raw_job_harvests')
    .select('raw_payload')
    .eq('source_platform', 'WeWorkRemotely (Live Audit)')
    .limit(1)
    .single();

  if (data) {
    fs.writeFileSync('wwr-payload.html', data.raw_payload);
    console.log("✅ Dumped WWR payload to wwr-payload.html");
  }
}

dumpPayload();
