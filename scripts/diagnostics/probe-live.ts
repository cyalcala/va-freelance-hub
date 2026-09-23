const sources = [
  { id: "breezy:20four7va", url: "https://20four7va.breezy.hr/json" },
  { id: "breezy:sourcefit", url: "https://sourcefit.breezy.hr/json" },
  { id: "breezy:remote-craft", url: "https://remote-craft.breezy.hr/json" },
  { id: "breezy:value-virtual-assistants", url: "https://value-virtual-assistants.breezy.hr/json" },
  { id: "breezy:yokly", url: "https://yokly.breezy.hr/json" },
  { id: "breezy:time-etc", url: "https://time-etc.breezy.hr/json" },
  { id: "greenhouse:ghost", url: "https://boards-api.greenhouse.io/v1/boards/ghost/jobs" },
  { id: "greenhouse:nearform", url: "https://boards-api.greenhouse.io/v1/boards/nearform/jobs" },
  { id: "teamtailor:career.teamtailor.com", url: "https://career.teamtailor.com/feed/jobs.xml?format=simplified" },
  { id: "recruitee:myjewellery", url: "https://myjewellery.recruitee.com/api/offers" },
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
