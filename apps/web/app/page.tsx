import { db, opportunities, vaDirectory } from "@/lib/db";
import { eq, desc, count } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { OpportunityCard } from "@/components/opportunity-card";

export const dynamic = 'force-dynamic';
export const revalidate = 0; 

async function getStats() {
  const [oppCount] = await db.select({ count: count() }).from(opportunities).where(eq(opportunities.isActive, true));
  const [dirCount] = await db.select({ count: count() }).from(vaDirectory);
  return { opportunities: oppCount?.count ?? 0, companies: dirCount?.count ?? 0 };
}

async function getLatestOpportunities() {
  return db
    .select()
    .from(opportunities)
    .where(eq(opportunities.isActive, true))
    .orderBy(desc(opportunities.scrapedAt))
    .limit(9);
}

export default async function HomePage() {
  headers().set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  const [stats, latest] = await Promise.all([getStats(), getLatestOpportunities()]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="mb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Auto-updates every 2 hours
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Remote jobs for{" "}
          <span className="text-accent">Filipino freelancers</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          A self-updating directory of VA and freelance opportunities — curated
          from the best remote job boards and refreshed automatically.
        </p>
        <div className="flex gap-8 justify-center mt-8">
          <Stat value={stats.opportunities} label="Active Opportunities" />
          <Stat value={stats.companies} label="VA-Friendly Companies" />
        </div>
        <div className="flex gap-3 justify-center mt-8">
          <Link
            href="/opportunities"
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
          >
            Browse Jobs
          </Link>
          <Link
            href="/directory"
            className="px-5 py-2.5 border border-border hover:border-zinc-600 text-zinc-300 rounded-lg font-medium transition-colors text-sm"
          >
            VA Directory
          </Link>
        </div>
      </div>

      {/* Latest opportunities */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">Latest Opportunities</h2>
          <Link href="/opportunities" className="text-sm text-accent hover:text-accent-hover transition-colors">
            View all →
          </Link>
        </div>
        {latest.length === 0 ? (
          <EmptyState message="No opportunities yet — the scraper will populate this soon." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold font-mono text-zinc-100">{value.toLocaleString()}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-border rounded-xl p-10 text-center text-zinc-500 text-sm">
      {message}
    </div>
  );
}
