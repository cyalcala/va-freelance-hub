const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const NSFW_KEYWORDS = [
  'nsfw', 'adult', 'porn', 'sex', 'escort', 'dating', 'onlyfans', 'webcam', 
  'gambling', 'casino', 'betting', 'poker', 'slots', 'crypto scam', 'ponzi'
];

async function checkUrl(url) {
  try {
    const response = await fetch(url, { 
      method: 'GET', 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VA-Index-Probe/1.0' },
      redirect: 'follow'
    });

    if (!response.ok) {
      if (response.status === 404) return { valid: false, reason: '404' };
      if (response.status >= 500) return { valid: false, reason: `Server Error: ${response.status}` };
    }

    const html = await response.text();
    const lowHtml = html.toLowerCase();

    // Basic title/meta extraction without a full parser to be fast
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].toLowerCase() : '';
    
    for (const kw of NSFW_KEYWORDS) {
      if (title.includes(kw) || lowHtml.includes(`name="description" content="${kw}`)) {
        return { valid: false, reason: `NSFW Keyword: ${kw}`, title };
      }
    }

    // Check for redirect loop or landing page patterns that aren't jobs
    if (response.url.includes('expired') || response.url.includes('not-found') || response.url.includes('404')) {
      return { valid: false, reason: 'Redirected to failure page', finalUrl: response.url };
    }

    return { valid: true };
  } catch (error) {
    if (error.name === 'AbortError') return { valid: false, reason: 'Timeout' };
    return { valid: false, reason: `Fetch Error: ${error.message}` };
  }
}

async function runSweep() {
  console.log('--- STARTING OPERATION NIGHTWATCH PROBE ---');
  
  const res = await client.execute("SELECT id, url, title FROM opportunities WHERE is_active = 1");
  const jobs = res.rows;
  
  console.log(`Scanning ${jobs.length} active jobs...`);
  
  let purgedCount = 0;
  const purgedIds = [];

  for (const job of jobs) {
    process.stdout.write(`Checking [${job.id}] ${job.url.substring(0, 50)}... `);
    const result = await checkUrl(job.url);
    
    if (!result.valid) {
      console.log(`❌ PURGE: ${result.reason}`);
      purgedCount++;
      purgedIds.push(job.id);
      
      // Execute deletion or mark inactive
      await client.execute({
        sql: "UPDATE opportunities SET is_active = 0, metadata = json_set(metadata, '$.purge_reason', ?) WHERE id = ?",
        args: [result.reason, job.id]
      });
    } else {
      console.log('✅ OK');
    }
  }

  console.log(`\n--- SWEEP COMPLETE ---`);
  console.log(`Total Scanned: ${jobs.length}`);
  console.log(`Total Purged: ${purgedCount}`);

  // Update records in vitals
  await client.execute({
    sql: "UPDATE vitals SET total_purged = total_purged + ?, last_intervention_at = ?, last_intervention_reason = ? WHERE id = 'GLOBAL'",
    args: [purgedCount, Date.now(), `Nightwatch Sweep: Purged ${purgedCount} dead/malicious links.`]
  });

  process.exit(0);
}

runSweep().catch(err => {
  console.error('Fatal Sweep Error:', err);
  process.exit(1);
});
