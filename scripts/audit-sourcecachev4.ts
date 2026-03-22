const sources = [
  "Reddit r/VirtualAssistant|https://www.reddit.com/r/VirtualAssistant/new.json?limit=10",
  "Reddit r/forhire|https://www.reddit.com/r/forhire/new.json?limit=10",
  "Himalayas|https://himalayas.app/jobs/api?limit=10",
  "RemoteOK|https://remoteok.com/api",
  "Jobicy|https://jobicy.com/api/v2/remote-jobs?count=10"
];

async function check() {
  console.log("=== PHASE 3.1: SOURCE CACHE-POISONING DETECTION ===\n");
  for (const entry of sources) {
    const [label, url] = entry.split("|");
    const bustUrl1 = `${url}${url.includes('?') ? '&' : '?'}audit_a=${Date.now()}`;
    const bustUrl2 = `${url}${url.includes('?') ? '&' : '?'}audit_b=${Date.now() + 31000}`;
    
    try {
      const res1 = await fetch(bustUrl1, { headers: { "User-Agent": "VA.INDEX/4.0 (audit)" } });
      const text1 = await res1.text();
      
      await new Promise(r => setTimeout(r, 10000)); // 10s enough for basic CDN check
      
      const res2 = await fetch(bustUrl2, { headers: { "User-Agent": "VA.INDEX/4.0 (audit)" } });
      const text2 = await res2.text();
      
      if (res1.status === 429) console.log(`  RATE_LIMITED   ${label}`);
      else if (text1 === text2) {
        console.log(`  CACHE_SUSPECT  ${label} (Identical hash after 10s)`);
      } else {
        console.log(`  LIVE           ${label} (HTTP ${res1.status})`);
      }
    } catch (e: any) {
      console.log(`  UNREACHABLE    ${label} (${e.message})`);
    }
  }
}

check();
