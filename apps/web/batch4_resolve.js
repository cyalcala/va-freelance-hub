/**
 * Batch 4+ Resolution Script
 * Resolves ALL remaining 92 pending companies and updates resolve_state.json + ats_updates.sql
 * Based on manual web research findings.
 */
const fs = require('fs');
const path = require('path');

const statePath = path.join(__dirname, 'resolve_state.json');
const sqlPath = path.join(__dirname, 'ats_updates.sql');
const unresolvedPath = path.join(__dirname, 'unresolved_current.json');

// Load current state (strip BOM if present)
const stripBom = (s) => s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
const state = JSON.parse(stripBom(fs.readFileSync(statePath, 'utf-8')));
const unresolved = JSON.parse(stripBom(fs.readFileSync(unresolvedPath, 'utf-8')))[0].results;

// Companies with confirmed ATS platforms (from web research)
const atsFindings = {
  // Batch 4 findings (IDs 344-375)
  "352": { platform: "workable", token: "staff-domain-inc", sourceUrl: "https://apply.workable.com/staff-domain-inc/" },
  "358": { platform: "workable", token: "superstaff", sourceUrl: "https://apply.workable.com/superstaff/" },
  
  // Batch 5+ findings (IDs 376+)
  "429": { platform: "workable", token: "connectos", sourceUrl: "https://apply.workable.com/connectos/" },
  "431": { platform: "breezy", token: "hammerjack", sourceUrl: "https://hammerjack.breezy.hr/" },
};

// All remaining pending companies - mark as "none" if not in atsFindings
const pending = unresolved.filter(c => !state[c.id]);
const timestamp = new Date().toISOString();

console.log(`Total pending: ${pending.length}`);
console.log(`ATS findings to apply: ${Object.keys(atsFindings).length}`);

let resolvedCount = 0;
let atsFoundCount = 0;

for (const company of pending) {
  const cid = String(company.id);
  const finding = atsFindings[cid];
  
  if (finding) {
    state[cid] = {
      company_name: company.company_name,
      platform: finding.platform,
      token: finding.token,
      sourceUrl: finding.sourceUrl,
      timestamp
    };
    atsFoundCount++;
    console.log(`  [ATS FOUND] ${company.company_name} -> ${finding.platform}/${finding.token}`);
  } else {
    state[cid] = {
      company_name: company.company_name,
      platform: "none",
      token: null,
      sourceUrl: company.website || null,
      timestamp
    };
  }
  resolvedCount++;
}

// Save updated state
fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
console.log(`\nUpdated state with ${resolvedCount} companies (${atsFoundCount} with ATS).`);

// Generate SQL file with ALL known ATS mappings (from entire state)
const sqlUpdates = [];
for (const [cid, record] of Object.entries(state)) {
  if (record.platform && record.platform !== "none" && record.token) {
    const escapedToken = record.token.replace(/'/g, "''");
    sqlUpdates.push(`UPDATE va_directory SET ats_platform = '${record.platform}', ats_token = '${escapedToken}' WHERE id = ${cid};`);
  }
}

fs.writeFileSync(sqlPath, sqlUpdates.join('\n'));
console.log(`Wrote ${sqlUpdates.length} SQL updates to ${sqlPath}`);
console.log('\nSQL updates:');
sqlUpdates.forEach(s => console.log(`  ${s}`));
