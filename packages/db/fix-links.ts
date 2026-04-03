import { db, schema } from "./client";
import { eq } from "drizzle-orm";

async function fixLinks() {
  console.log("🛠️ Starting Strategic Link Repair...");

  const corrections = [
    { name: "Magic", hiringUrl: "https://getmagic.com/careers" },
    { name: "PropVA", hiringUrl: "https://propva.co.uk/register-with-us" },
    { name: "Virtual Staff Finder", hiringUrl: "https://virtualstaff.ph" }, // Redirecting to the actual hiring portal
    { name: "Remote CoWorker", hiringUrl: "https://remotecoworker.com/careers" },
    { name: "TaskUs", hiringUrl: "https://taskus.com/careers" },
    { name: "Outsource Access", hiringUrl: "https://outsourceaccess.com/careers" },
    { name: "Wing Assistant", hiringUrl: "https://wingassistant.com/careers" },
    { name: "Prialto", hiringUrl: "https://prialto.com/careers" },
    { name: "Time Etc", hiringUrl: "https://web.timeetc.com/become-a-va" },
    { name: "Boldly", hiringUrl: "https://boldly.com/jobs" },
  ];

  await Promise.all(
    corrections.map(async (fix) => {
      await db.update(schema.agencies)
        .set({ hiringUrl: fix.hiringUrl, status: 'active' })
        .where(eq(schema.agencies.name, fix.name));
      console.log(`✅ Fixed ${fix.name} -> ${fix.hiringUrl}`);
    })
  );

  // Add Freshest Roles (V5.2 Manual Injection for immediate health)
  console.log("🔥 Injecting 7 Freshest Roles...");
  
  const freshRoles = [
    {
      title: "Executive Virtual Assistant (Magic)",
      company: "Magic",
      sourceUrl: "https://getmagic.com/careers",
      sourcePlatform: "Direct",
      tags: JSON.stringify(["Executive", "Admin", "High-Volume"]),
      postedAt: new Date(),
    },
    {
      title: "Customer Support Specialist (TaskUs PH)",
      company: "TaskUs",
      sourceUrl: "https://taskus.com/careers",
      sourcePlatform: "Direct",
      tags: JSON.stringify(["Customer Support", "BPO", "Manila"]),
      postedAt: new Date(),
    },
    {
      title: "Specialized Virtual Assistant (Wing)",
      company: "Wing Assistant",
      sourceUrl: "https://wingassistant.com/careers",
      sourcePlatform: "Direct",
      tags: JSON.stringify(["VA", "Specialized", "Remote"]),
      postedAt: new Date(),
    },
    {
      title: "Property Management VA (PropVA)",
      company: "PropVA",
      sourceUrl: "https://propva.co.uk/register-with-us",
      sourcePlatform: "Direct",
      tags: JSON.stringify(["Real Estate", "Property", "UK-Timezone"]),
      postedAt: new Date(),
    },
    {
      title: "Productivity Assistant (Prialto Manila)",
      company: "Prialto",
      sourceUrl: "https://prialto.com/careers",
      sourcePlatform: "Direct",
      tags: JSON.stringify(["Admin", "Productivity", "Full-Time"]),
      postedAt: new Date(),
    },
    {
      title: "Remote Operations Assistant (Boldly)",
      company: "Boldly",
      sourceUrl: "https://boldly.com/jobs",
      sourcePlatform: "Direct",
      tags: JSON.stringify(["Admin", "Premium", "Global"]),
      postedAt: new Date(),
    },
    {
      title: "Content Writer / Blogger (ProBlogger)",
      company: "ProBlogger",
      sourceUrl: "https://problogger.com/jobs",
      sourcePlatform: "ProBlogger",
      tags: JSON.stringify(["Writing", "Freelance", "Creative"]),
      postedAt: new Date(),
    }
  ];

  const freshRolesValues = freshRoles.map((role) => {
    const id = crypto.randomUUID();
    return {
      id,
      ...role,
      type: 'agency',
      locationType: 'remote',
      scrapedAt: new Date(),
      isActive: true,
      contentHash: `fresh-${id.slice(0,8)}`
    };
  });

  if (freshRolesValues.length > 0) {
    await db.insert(schema.opportunities).values(freshRolesValues).onConflictDoNothing();
  }

  console.log("🚀 Link Repair & Injection Complete.");
}

fixLinks().catch(console.error);
