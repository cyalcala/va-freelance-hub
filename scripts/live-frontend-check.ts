async function run() {
  try {
    const res = await fetch("https://va-freelance-hub-web.vercel.app", {
      headers: { "User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache" }
    });
    const html = await res.text();
    
    console.log("=== LIVE FRONTEND SIGNAL CAPTURE ===");
    
    // Simple regex to extract titles and relative dates
    const titleMatches = [...html.matchAll(/group-hover:text-blueberry-500 transition-colors leading-tight mb-1 uppercase tracking-tight break-words">(.*?)<\/h3>/g)];
    const dateMatches = [...html.matchAll(/text-blueberry-800\/40 uppercase tracking-tighter">(.*?)<\/span>/g)];

    for (let i = 0; i < 3; i++) {
       console.log(`${i+1}. TITLE: ${titleMatches[i]?.[1] || "N/A"}`);
       console.log(`   TIME:  ${dateMatches[i]?.[1] || "N/A"}`);
    }

    if (html.includes("No matching signals found")) {
      console.log("!!! EMERGENCY: FEED STILL EMPTY !!!");
    } else {
      console.log("✅ FEED HAS CONTENT.");
    }

  } catch (e: any) {
    console.error("CAPTURE FAILED:", e.message);
  }
}
run();
