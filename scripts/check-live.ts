const sources = [
  "20Four7VA",
  "Sourcefit",
  "Remote Craft",
  "VALUE Virtual Assistants",
  "Yokly",
];

console.log("=== 1. VERIFYING ALL 5 GRADUATED SOURCES ON /opportunities?platform=... ===");
for (const platform of sources) {
  const url = `https://remotejobs-ph.pages.dev/opportunities?platform=${encodeURIComponent(platform)}`;
  const res = await fetch(url);
  const html = await res.text();
  const cardMatches = [...html.matchAll(/class="font-semibold text-ink text-\[15px\][^>]*>([^<]+)</g)];
  const cardCount = cardMatches.length;
  const hasJobs = cardCount > 0;

  console.log(`[${platform}]`);
  console.log(`  URL: ${url}`);
  console.log(`  Status: HTTP ${res.status}`);
  console.log(`  Rendered Cards on Page 1: ${cardCount}`);
  if (cardCount > 0) {
    console.log(`  Sample Roles:`);
    for (const c of cardMatches.slice(0, 3)) {
      console.log(`    - ${c[1].replace(/&amp;/g, "&")}`);
    }
  }
  console.log(`  Visible on Site: ${hasJobs ? "✅ YES" : "❌ NO"}\n`);

}

console.log("=== 2. VERIFYING DIRECTORY SEARCH (/directory?q=...) ===");
for (const platform of sources) {
  const qUrl = `https://remotejobs-ph.pages.dev/directory?q=${encodeURIComponent(platform)}`;
  const qRes = await fetch(qUrl);
  const qHtml = await qRes.text();
  const found = qHtml.includes(platform);
  console.log(`  ${platform.padEnd(26)}: ${found ? "✅ YES" : "❌ NO"}`);
}

console.log("\n=== 3. VERIFYING HOMEPAGE (https://remotejobs-ph.pages.dev/) ===");
const homeRes = await fetch("https://remotejobs-ph.pages.dev/");
const homeHtml = await homeRes.text();
for (const platform of sources) {
  const found = homeHtml.includes(platform);
  console.log(`  ${platform.padEnd(26)}: ${found ? "✅ YES" : "❌ NO"}`);
}
