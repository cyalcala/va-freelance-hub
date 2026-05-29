import fs from 'fs';
import { execSync } from 'child_process';

const envText = fs.readFileSync('../../.env', 'utf8');
const geminiKeyMatch = envText.match(/GEMINI_API_KEY=([^\r\n]+)/);
if (!geminiKeyMatch) {
  console.error("No GEMINI_API_KEY found in .env");
  process.exit(1);
}
const apiKey = geminiKeyMatch[1].trim();

const model = 'gemini-2.5-flash-lite';
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

// Load unresolved agencies
const unresolvedStr = fs.readFileSync('unresolved_current.json', 'utf8').replace(/^\uFEFF/, '');
const rawData = JSON.parse(unresolvedStr);
const agencies = rawData[0].results;

// Load state if exists, otherwise initialize
let state = {};
if (fs.existsSync('resolve_state.json')) {
  try {
    state = JSON.parse(fs.readFileSync('resolve_state.json', 'utf8'));
  } catch (e) {
    console.error("Failed to parse state file, starting fresh:", e);
  }
}

const BATCH_SIZE = 5;
const DELAY_MS = 7000; // 7 seconds delay to stay under 15 RPM limit

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryGemini(batch) {
  const prompt = `For each of these companies, search the web to find if their careers/jobs page is hosted on Lever, Greenhouse, Workable, or Breezy.
If they do use one of these four platforms, find the exact platform and company slug/token they use.
For example, if they use Lever and their jobs URL is jobs.lever.co/company-slug, the platform is 'lever' and token is 'company-slug'.
If they do not use any of these four platforms (e.g. they use custom careers page, or other platforms like Pinpoint, BambooHR, Workday, etc.), output platform 'none' and token null.

Companies to check:
${JSON.stringify(batch.map(a => ({ id: a.id, company_name: a.company_name, website: a.website })), null, 2)}

Provide the output as a valid JSON array of objects, each object containing:
- "id": number
- "company_name": string
- "platform": "lever" | "greenhouse" | "workable" | "breezy" | "none"
- "token": string | null
- "sourceUrl": string (the careers page or jobs board URL you found supporting this)

Only output the JSON array inside markdown code block. Do not write any other explanation or text outside the markdown code block.`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        tools: [{
          googleSearch: {}
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[1]?.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }
    return text;
  } catch (error) {
    console.error("Gemini API call failed:", error.message);
    return null;
  }
}

function parseJsonFromMarkdown(text) {
  const match = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/```\s*([\s\S]+?)\s*```/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error("Failed to parse JSON extracted from code block:", e);
    }
  }
  // Try parsing the whole text
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Failed to parse raw text as JSON:", e);
  }
  return null;
}

async function run() {
  const pendingAgencies = agencies.filter(a => !state[a.id]).slice(0, 30);
  console.log(`Total agencies: ${agencies.length}. Pending in this run: ${pendingAgencies.length}.`);

  if (pendingAgencies.length === 0) {
    console.log("No pending agencies to process in this batch.");
    return;
  }

  for (let i = 0; i < pendingAgencies.length; i += BATCH_SIZE) {
    const batch = pendingAgencies.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(pendingAgencies.length / BATCH_SIZE)}...`);
    console.log(`Companies: ${batch.map(a => a.company_name).join(', ')}`);

    let responseText = await queryGemini(batch);
    if (!responseText) {
      console.log("Retry in 15 seconds...");
      await sleep(15000);
      responseText = await queryGemini(batch);
    }

    if (responseText) {
      const results = parseJsonFromMarkdown(responseText);
      if (Array.isArray(results)) {
        for (const result of results) {
          state[result.id] = {
            company_name: result.company_name,
            platform: result.platform,
            token: result.token,
            sourceUrl: result.sourceUrl,
            timestamp: new Date().toISOString()
          };
          console.log(`  [State] Saved: ${result.company_name} -> ${result.platform} (${result.token})`);
        }
        // Write state file immediately to save progress
        fs.writeFileSync('resolve_state.json', JSON.stringify(state, null, 2));
      } else {
        console.warn("Could not parse valid array from response:", responseText);
      }
    } else {
      console.error("Failed to get response for this batch, skipping for now.");
    }

    // Sleep to respect rate limits
    if (i + BATCH_SIZE < pendingAgencies.length) {
      console.log(`Waiting ${DELAY_MS}ms...`);
      await sleep(DELAY_MS);
    }
  }

  console.log("\nBatch resolution completed! Generating SQL updates...");
  generateSqlUpdates();
}

function generateSqlUpdates() {
  const sqlCommands = [];
  let foundCount = 0;
  for (const id in state) {
    const record = state[id];
    if (record.platform && record.platform !== 'none' && record.token) {
      // Escape single quotes in company name and token
      const escapedToken = record.token.replace(/'/g, "''");
      sqlCommands.push(`UPDATE va_directory SET ats_platform = '${record.platform}', ats_token = '${escapedToken}' WHERE id = ${id};`);
      foundCount++;
    }
  }

  if (sqlCommands.length > 0) {
    fs.writeFileSync('ats_updates.sql', sqlCommands.join('\n'));
    console.log(`Wrote ${foundCount} SQL updates to ats_updates.sql.`);
  } else {
    console.log("No ATS platforms identified in this run.");
  }
}

run().catch(console.error);
