import { createClient } from "@libsql/client/http";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./apps/frontend/src/db-local/schema";
import { desc, not, eq } from 'drizzle-orm';

const url = "libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQwMDAzMzAsImlkIjoiMDE5Y2ZiOGYtMWUwMS03Y2I5LTkzMTctN2Y2Njc1ZjNhYjRmIiwicmlkIjoiMWQ2YWE5YTgtY2ZmYS00MDI3LTg1NzAtZWNjMjY4YjFjMDJjIn0.A_l2AMOKJNBTZD6QcG5dB529Yw3BO2fawjHk5bQaWdWId3598DRgpIOycdNqoZKfA8uxRpgZnCq_v3VcXWArCA";

const client = createClient({
  url: url,
  authToken: token,
});

export const db = drizzle(client, { schema });

async function getSortedSignals(limit = 50) {
  const now = Date.now();

  const candidates = await db.select()
    .from(schema.opportunities)
    .where(not(eq(schema.opportunities.tier, 4)))
    .orderBy(desc(schema.opportunities.latestActivityMs))
    .limit(100);

  const sorted = candidates
    .map(sig => {
      const now = Date.now();
      const ageMs = now - (sig.latestActivityMs || 0);

      const tierGravity = (sig.tier ?? 3) * 24.0;
      const agePenalty = ageMs <= 900000 ? -12.0 : ageMs / 3600000.0;

      const sp = (sig.sourcePlatform || "").toLowerCase();
      let sourceBoost = 0;

      if (sp.includes("reddit")) {
        sourceBoost = -48.0;
      } else if (["vajobsph", "phcareers", "onlinejobs", "phjobs", "kalibrr"].some(p => sp.includes(p))) {
        sourceBoost = -24.0;
      }

      const isSupport = [
        "customer service", "customer support", "client support", "support specialist",
        "support representative", "support agent", "help desk", "live chat", "chat support",
        "customer experience", "technical support", "it support"
      ].some(s => (sig.title || "").toLowerCase().includes(s));

      if (isSupport) {
        sourceBoost -= 72.0;
      }

      return { ...sig, sortScore: tierGravity + agePenalty + sourceBoost };
    })
    .sort((a, b) => a.sortScore - b.sortScore);

  return sorted.slice(0, limit);
}

async function main() {
  const result = await getSortedSignals();
  console.log("getSortedSignals length: ", result.length);
}
main();
