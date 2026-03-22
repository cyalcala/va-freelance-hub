import { siftOpportunity } from "./jobs/lib/sifter.ts";

const TEST_SET = [
  { id: "VA_001", title: "Virtual Assistant", company: "Remote Ops", desc: "Admin support. Remote. PH preferred.", source: "reddit", expect: 3 },
  { id: "VA_002", title: "Executive Assistant", company: "US Firm", desc: "EA from Philippines. Direct hire. FT.", source: "reddit", expect: 1 },
  { id: "VA_003", title: "Virtual Assistant — Social Media", company: "Marketing Co", desc: "Social media VA. Manila-based client.", source: "himalayas", expect: 2 },
  { id: "VA_004", title: "Senior Virtual Assistant", company: "Agency", desc: "Lead VA for a team. Philippines.", source: "reddit", expect: 2 },
  { id: "VA_005", title: "Lead Administrative Assistant", company: "Remote Company", desc: "Admin lead. Remote from Southeast Asia.", source: "remoteok", expect: 2 }
];

async function run() {
  console.log("=== PHASE 4: SIFTER CLASSIFICATION AUDIT ===\n");
  let fp = 0;
  for (const r of TEST_SET) {
    try {
      const tier = siftOpportunity(r.title, r.company, r.desc, r.source);
      if (tier === 4) {
        fp++;
        console.log(`  FALSE_POSITIVE [${r.id}] → TRASH | "${r.title}"`);
      } else {
        console.log(`  OK [${r.id}] → Tier ${tier}`);
      }
    } catch (e: any) {
      console.log(`  ERROR [${r.id}]: ${e.message}`);
      fp++;
    }
  }
  console.log(`\n  FP Rate: ${Math.round(fp / TEST_SET.length * 100)}%`);
}

run();
