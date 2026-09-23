import { execSync } from "child_process";

import fs from "fs";

const payload = {
  task: "choose",
  goal: "Determine whether mature shadow sources (ghost, nearform, teamtailor, time-etc) with >11 distinct days and 100% healthy shadow observation should graduate directly to active (Production) or promote to canary stage first according to the DISCOVERY->PROBE->SHADOW->OBSERVATION->CANARY->PRODUCTION lifecycle",
  variants: {
    Variant_A_Direct_To_Production: "Graduate clean mature shadow sources directly to active/production alongside the Sept 19 canary cohort",
    Variant_B_Strict_Lifecycle_Canary_First: "Promote clean mature shadow sources from shadow to canary stage with canary caps, while graduating the matured Sept 19 canary cohort (the 5 Breezy agencies) to active/production",
  },
};

fs.writeFileSync("scripts/diagnostics/jev-input.json", JSON.stringify(payload));
const cmd = `node C:\\Users\\admin\\.gemini\\config\\plugins\\jev\\bin\\judge.cjs --json @scripts/diagnostics/jev-input.json`;
try {
  const res = execSync(`node C:\\Users\\admin\\.gemini\\config\\plugins\\jev\\bin\\judge.cjs --task choose --goal "${payload.goal}" --variants "${JSON.stringify(payload.variants).replace(/"/g, '\\"')}"`, { encoding: "utf-8" });
  console.log(res);
} catch (e) {
  console.error(e.stdout || e.message);
}

