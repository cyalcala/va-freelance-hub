const sources = [
  { id: "greenhouse:gitlab", url: "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs" },
  { id: "greenhouse:grafanalabs", url: "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs" },
  { id: "greenhouse:remotecom", url: "https://boards-api.greenhouse.io/v1/boards/remotecom/jobs" },
  { id: "greenhouse:wikimedia", url: "https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs" },
  { id: "workable:coconutva", url: "https://apply.workable.com/api/v1/widget/accounts/coconutva" },
  { id: "workable:crewbloom", url: "https://apply.workable.com/api/v1/widget/accounts/crewbloom" },
  { id: "workable:hello-rache", url: "https://apply.workable.com/api/v1/widget/accounts/hello-rache" },
  { id: "workable:hunt-st", url: "https://apply.workable.com/api/v1/widget/accounts/hunt-st" },
  { id: "workable:pearltalent", url: "https://apply.workable.com/api/v1/widget/accounts/pearltalent" },
  { id: "workable:pineapple-staffing", url: "https://apply.workable.com/api/v1/widget/accounts/pineapple-staffing" },
  { id: "workable:rocketams", url: "https://apply.workable.com/api/v1/widget/accounts/rocketams" },
];

for (const s of sources) {
  try {
    const start = Date.now();
    const res = await fetch(s.url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
    const elapsed = Date.now() - start;
    const text = await res.text();
    let jobCount = 0;
    try {
      const data = JSON.parse(text);
      jobCount = Array.isArray(data) ? data.length : data.jobs ? data.jobs.length : data.offers ? data.offers.length : 0;
    } catch {
      jobCount = (text.match(/<job>/g) || []).length;
    }
    console.log(`${s.id.padEnd(35)} | HTTP ${res.status} | ${elapsed}ms | ${text.length} bytes | ${jobCount} jobs`);
  } catch (e: any) {
    console.log(`${s.id.padEnd(35)} | ERROR: ${e.message}`);
  }
}
