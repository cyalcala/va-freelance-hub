// VA.INDEX Hyperhealth Check v1.0
// MISSION: Detect and report site outages or critical performance degradation.
// Using native Bun fetch (zero-dependency).

async function checkHealth() {
  const urls = [
    "https://va-freelance-hub-web.vercel.app/",
    "https://va-freelance-hub-web.vercel.app/api/control/feed"
  ];

  console.log("🕵️  Sentinel Health Check: Probing 'Titanium' Reliability...");

  for (const url of urls) {
    try {
      const start = Date.now();
      const res = await fetch(url, { method: "GET" });
      const duration = Date.now() - start;

      if (res.status === 200) {
        console.log(`✅ [OK] ${url} (${duration}ms)`);
        if (duration > 3000) {
          console.warn(`⚠️  REDUCED: ${url} response time exceeds 3s budget.`);
        }
      } else {
        console.error(`❌ [FAIL] ${url} returned STATUS ${res.status}`);
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`🆘 [CRITICAL] Cannot reach ${url}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("⚡  Hyperhealth Verified: Site is Online.");
}

checkHealth();
