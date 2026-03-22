async function run() {
  const urls = [
    "https://www.reddit.com/r/remotejobs/new.json?limit=5",
    "https://www.reddit.com/r/forhire/new.json?limit=5"
  ];
  try {
    for (const url of urls) {
      console.log(`\n=== AUDITING ${new URL(url).pathname} ===`);
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const json = await res.json();
      const posts = json.data.children.map((c: any) => ({
        title: c.data.title,
        age_mins: Math.round((Date.now() - (c.data.created_utc * 1000)) / 60000)
      }));
      console.table(posts);
    }
  } catch (e: any) {
    console.error("FAIL:", e.message);
  }
}
run();
