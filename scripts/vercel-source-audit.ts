async function run() {
  const sources = [
    "https://www.reddit.com/r/VirtualAssistant/new.json?limit=1",
    "https://www.reddit.com/r/forhire/new.json?limit=1",
    "https://www.reddit.com/r/remotejobs/new.json?limit=1",
    "https://www.reddit.com/r/phcareers/new.json?limit=1",
    "https://www.reddit.com/r/VAjobsPH/new.json?limit=1",
    "https://remoteok.com/api",
    "https://jobicy.com/api/v2/remote-jobs?count=1",
    "https://himalayas.app/jobs/api?limit=1"
  ];

  const vercelBase = "https://va-freelance-hub-web.vercel.app";
  const endpoints = ["/api/health", "/api/opportunities", "/api/jobs", "/api/listings", "/api/feed"];

  console.log("=== VERCEL INTERROGATION ===");
  try {
    const healthRes = await fetch(`${vercelBase}/api/health`);
    console.log("Health JSON:", await healthRes.json());
    console.log("Health Headers Cache-Control:", healthRes.headers.get("cache-control"));
    console.log("Health Headers X-Vercel-Cache:", healthRes.headers.get("x-vercel-cache"));

    const homeRes = await fetch(vercelBase);
    console.log("Homepage Status:", homeRes.status);
    console.log("Homepage X-Vercel-Cache:", homeRes.headers.get("x-vercel-cache"));
    const text = await homeRes.text();
    if (text.includes("No matching signals found")) {
      console.log("EMPTY_SIGNAL: PRESENT");
    } else {
      console.log("EMPTY_SIGNAL: ABSENT");
    }

    for (const ep of endpoints) {
      const res = await fetch(`${vercelBase}${ep}`);
      console.log(`${ep}: HTTP ${res.status}`);
    }
  } catch (e: any) {
    console.error("VERCEL_FAIL:", e.message);
  }

  console.log("\n=== SOURCE AVAILABILITY ===");
  for (const s of sources) {
    try {
      const res = await fetch(s, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
      });
      console.log(`${new URL(s).hostname}${new URL(s).pathname}: HTTP ${res.status}`);
    } catch (e: any) {
      console.error(`${s}: FAIL - ${e.message}`);
    }
  }
}
run();
