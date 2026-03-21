import { db, schema } from "./client";
import { eq } from "drizzle-orm";

async function applyStrategy() {
  console.log("🛠️ Applying Hiring Heat & Friction Strategy...");

  // Ranking Strategy: 1=Easiest (Direct), 5=Hardest
  const strategy = [
    { name: "Magic", heat: 3, friction: 1, url: "https://getmagic.com/careers" },
    { name: "TaskUs", heat: 3, friction: 1, url: "https://taskus.com/careers" },
    { name: "Wing Assistant", heat: 3, friction: 1, url: "https://wingassistant.com/careers" },
    { name: "Prialto", heat: 2, friction: 2, url: "https://prialto.com/careers" },
    { name: "Remote CoWorker", heat: 2, friction: 2, url: "https://remotecoworker.com/careers" },
    { name: "PropVA", heat: 1, friction: 4, url: "https://propva.zohorecruit.eu/jobs/Careers" }, // Pushing further down
    { name: "Boldly", heat: 2, friction: 3, url: "https://boldly.com/jobs" },
    { name: "Time Etc", heat: 1, friction: 3, url: "https://web.timeetc.com/become-a-va" },
    { name: "Virtual Staff Finder", heat: 1, friction: 4, url: "https://virtualstaff.ph" },
  ];

  await Promise.all(strategy.map(async (s) => {
    await db.update(schema.agencies)
      .set({ 
        hiringHeat: s.heat, 
        frictionLevel: s.friction, 
        hiringUrl: s.url,
        status: 'active' 
      })
      .where(eq(schema.agencies.name, s.name));
    console.log(`✅ Strat: ${s.name} (Heat: ${s.heat}, Friction: ${s.friction})`);
  }));

  console.log("🚀 Strategy Applied.");
}

applyStrategy().catch(console.error);
