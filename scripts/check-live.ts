const sources = [
  "20Four7VA",
  "Sourcefit",
  "Remote Craft",
  "VALUE Virtual Assistants",
  "Yokly",
];

console.log("=== VERIFYING ALL 5 GRADUATED SOURCES ON PRODUCTION WEBSITE ===\n");

for (const platform of sources) {
  const url = `https://remotejobs-ph.pages.dev/opportunities?platform=${encodeURIComponent(platform)}`;
  const res = await fetch(url);
  const html = await res.text();

  const jobLinks = [...html.matchAll(/href="\/jobs\/(\d+)"/g)].map((m) => m[1]);
  const hasJobs = jobLinks.length > 0;

  console.log(`[${platform}]`);
  console.log(`  URL: ${url}`);
  console.log(`  Status: HTTP ${res.status}`);
  console.log(`  Rendered Opportunity Cards: ${jobLinks.length}`);
  console.log(`  Sample Job IDs: ${jobLinks.slice(0, 3).join(", ")}`);
  console.log(`  Verified On Page: ${hasJobs ? "✅ YES" : "❌ NO"}\n`);
}

// Also check directory page:
const dirRes = await fetch("https://remotejobs-ph.pages.dev/directory");
const dirHtml = await dirRes.text();
console.log("=== CHECKING DIRECTORY SEARCH (https://remotejobs-ph.pages.dev/directory?q=...) ===");
console.log("\n=== CHECKING HOMEPAGE (https://remotejobs-ph.pages.dev/) ===");
const homeRes = await fetch("https://remotejobs-ph.pages.dev/");
const homeHtml = await homeRes.text();
for (const platform of sources) {
  const found = homeHtml.includes(platform);
  console.log(`  ${platform} on homepage: ${found ? "✅ YES" : "❌ NO"}`);
}


