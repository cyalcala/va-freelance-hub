async function run() {
  const url = "https://www.reddit.com/r/VAjobsPH/new.json?limit=5";
  try {
     console.log(`=== LIVE REDDIT CONTENT AUDIT (${url}) ===`);
     const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
     });
     const data = await res.json();
     const titles = data.data.children.map((c: any) => ({
        title: c.data.title,
        url: c.data.url,
        age_mins: Math.round((Date.now() - (c.data.created_utc * 1000)) / 60000)
     }));
     console.log(JSON.stringify(titles, null, 2));
  } catch (e: any) {
    console.error("FAIL:", e.message);
  }
}
run();
