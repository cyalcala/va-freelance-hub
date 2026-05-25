import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvData = fs.readFileSync('C:\\Users\\admin\\Desktop\\freelance-directory\\career7.csv', 'utf8');
const records = parse(csvData, { columns: true, skip_empty_lines: true });

// Existing 16 companies from seed.ts
const existingCompanies = [
  "Time Etc", "Boldly", "Virtual Staff Finder", "Magic", "Remote CoWorker",
  "TaskUs", "Outsource Access", "BELAY", "Fancy Hands", "OnlineJobs.ph",
  "VirtualStaff.ph", "Invedus", "Wing Assistant", "Prialto", "Toptal"
].map(c => c.toLowerCase());

let sql = "INSERT INTO va_directory (company_name, website, hires_filipinos, niche, notes) VALUES\n";
const values = [];

for (const r of records) {
  const name = r['Remote Work Website'].trim();
  if (existingCompanies.includes(name.toLowerCase())) {
    continue; // Skip if already in the 16
  }
  
  const link = r['Links'].trim();
  const about = r['About'].trim();
  
  let niche = 'other';
  const aboutLower = about.toLowerCase();
  if (aboutLower.includes('real estate') || aboutLower.includes('property')) niche = 'admin';
  else if (aboutLower.includes('admin') || aboutLower.includes('executive')) niche = 'admin';
  else if (aboutLower.includes('tech') || aboutLower.includes('dev')) niche = 'tech';
  else if (aboutLower.includes('marketing') || aboutLower.includes('creative') || aboutLower.includes('social media') || aboutLower.includes('design')) niche = 'creative';
  else if (aboutLower.includes('customer') || aboutLower.includes('support')) niche = 'customer-support';
  else if (aboutLower.includes('finance') || aboutLower.includes('accounting')) niche = 'finance';
  else if (aboutLower.includes('virtual assistant')) niche = 'admin'; // fallback for generic VA

  values.push(`('${name.replace(/'/g, "''")}', '${link.replace(/'/g, "''")}', 1, '${niche}', '${about.replace(/'/g, "''")}')`);
}

sql += values.join(",\n") + ";\n";

fs.writeFileSync('seed2.sql', sql);
console.log(`Generated SQL for ${values.length} new VA agencies.`);
