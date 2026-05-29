import fs from 'fs';

const envText = fs.readFileSync('../../.env', 'utf8');
const geminiKeyMatch = envText.match(/GEMINI_API_KEY=([^\r\n]+)/);
if (!geminiKeyMatch) {
  console.error("No GEMINI_API_KEY found in .env");
  process.exit(1);
}
const apiKey = geminiKeyMatch[1].trim();

const companies = [
  { "id": 238, "company_name": "Shepherd", "website": "https://www.supportshepherd.com" },
  { "id": 266, "company_name": "ClearDesk", "website": "https://cleardesk.com" },
  { "id": 267, "company_name": "Cloudstaff", "website": "https://www.cloudstaff.com" },
  { "id": 268, "company_name": "Coconut VA", "website": "https://coconutva.com/" },
  { "id": 257, "company_name": "Athena Executive Assistants", "website": "https://jobs.athenago.com" }
];

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `For each of these companies, tell me if their public careers/jobs page is hosted on Lever, Greenhouse, Workable, or Breezy.
If they do use one of these four platforms, find the exact platform and company slug/token they use.
For example, if they use Lever and their jobs URL is jobs.lever.co/company-slug, the platform is 'lever' and token is 'company-slug'.
If they do not use any of these four platforms (e.g. they use custom careers page, or other platforms like Pinpoint, BambooHR, Zoho Recruit, etc.), output platform 'none' and token null.

Companies to check:
${JSON.stringify(companies, null, 2)}

Provide the output as a valid JSON array of objects, each object containing:
- "id": number
- "company_name": string
- "platform": "lever" | "greenhouse" | "workable" | "breezy" | "none"
- "token": string | null
- "sourceUrl": string (the careers page or jobs board URL you found supporting this)

Only output the JSON array inside markdown code block.`
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

test().catch(console.error);
