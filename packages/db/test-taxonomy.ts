import { mapTitleToDomain, extractDisplayTags, JobDomain } from "./taxonomy";

const testCases = [
  { title: "Product Designer", domain: JobDomain.CREATIVE_MULTIMEDIA },
  { title: "Virtual Assistant (Philippines)", domain: JobDomain.VA_SUPPORT, tag: "PH-DIRECT" },
  { title: "Copywriter", domain: JobDomain.CREATIVE_MULTIMEDIA },
  { title: "Operations Manager", domain: JobDomain.VA_SUPPORT },
  { title: "Account Executive", domain: JobDomain.SALES_GROWTH },
  { title: "Staff Pharmacist", domain: JobDomain.VA_SUPPORT },
  { title: "Bookkeeper", domain: JobDomain.ADMIN_BACKOFFICE },
  { title: "AI Training Specialist", domain: JobDomain.VA_SUPPORT },
  { title: "Customer Service Representative (Voice)", domain: JobDomain.BPO_SERVICES }
];

console.log("══ Taxonomy Engine Audit ══");
let passed = 0;

for (const tc of testCases) {
  const domain = mapTitleToDomain(tc.title);
  const tags = extractDisplayTags(tc.title, "");
  
  const isCorrect = domain === tc.domain;
  const hasTag = tc.tag ? tags.includes(tc.tag) : true;

  if (isCorrect && hasTag) {
    console.log(`[PASS] "${tc.title}" -> ${domain}`);
    passed++;
  } else {
    console.log(`[FAIL] "${tc.title}" -> GOT: ${domain} | EXPECTED: ${tc.domain}`);
  }
}

console.log(`\nAudit Complete: ${passed}/${testCases.length} Passed.`);
process.exit(passed === testCases.length ? 0 : 1);
