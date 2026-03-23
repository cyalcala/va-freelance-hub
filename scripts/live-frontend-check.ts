async function run() {
  const r = await fetch('https://va-freelance-hub-web.vercel.app/');
  if (!r.ok) { console.error('Failed to fetch', r.status); return; }
  const html = await r.text();
  const titles = [...html.matchAll(/group-hover:text-blueberry-500 .*?>([^<]+)<\/h3>/g)].map(m => m[1]);
  const companies = [...html.matchAll(/tracking-widest truncate\">([^<]+)<\/span>/g)].map(m => m[1]);
  const dates = [...html.matchAll(/uppercase tracking-tighter\">([^<]+)<\/span>/g)].map(m => m[1]);
  const ages = [...html.matchAll(/data-age=\"([0-9.]+)\"/g)].map(m => m[1]);
  
  let recentFound = 0;
  console.log("=== UI FEED TOP 20 ===");
  for(let i=0; i<Math.min(30, titles.length); i++) {
    const age = parseFloat(ages[i]);
    const isNew = age < 2;
    if (isNew) recentFound++;
    
    console.log(`[Age: ${ages[i]}h] ${titles[i].substring(0, 40)}... ${isNew ? ' <--- NEWEST BRONZE SIGNAL' : ''}`);
  }
  console.log(`\nFound ${recentFound} signals under 2 hours old in the top 30.`);
}
run();
