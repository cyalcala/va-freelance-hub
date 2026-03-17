import { db, opportunities } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { OpportunityCard } from "@/components/opportunity-card";

export const revalidate = 3600;

export const metadata = {
  title: "Opportunities — Remote PH",
  description: "Browse all remote freelance and VA job opportunities for Filipinos.",
};

export default async function OpportunitiesPage() {
  const items = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.isActive, true))
    .orderBy(desc(opportunities.scrapedAt))
    .limit(100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Opportunities</h1>
        <p className="text-zinc-400 text-sm">
          {items.length} active listings · auto-updated every 2 hours
        </p>
      </div>

      {items.length === 0 ? (
        <div className="border border-border rounded-xl p-16 text-center text-zinc-500 text-sm">
          No opportunities yet. Check back soon — the scraper runs every 2 hours.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}
