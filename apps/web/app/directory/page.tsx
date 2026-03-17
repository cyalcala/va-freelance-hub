import { db, vaDirectory } from "@/lib/db";
import { desc } from "drizzle-orm";
import { DirectoryCard } from "@/components/directory-card";

export const revalidate = 3600;

export const metadata = {
  title: "VA Directory — Remote PH",
  description: "Curated list of companies known to hire Filipino virtual assistants.",
};

export default async function DirectoryPage() {
  const entries = await db
    .select()
    .from(vaDirectory)
    .orderBy(desc(vaDirectory.createdAt));

  const filipinoFriendly = entries.filter((e) => e.hiresFilipinosf);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">VA Directory</h1>
        <p className="text-zinc-400 text-sm">
          {filipinoFriendly.length} companies that hire Filipino VAs ·{" "}
          {entries.length} total listed
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="border border-border rounded-xl p-16 text-center text-zinc-500 text-sm">
          Directory is being populated. Check back soon.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <DirectoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
