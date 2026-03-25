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

async function main() {
  try {
    const result = await db.select()
      .from(schema.opportunities)
      .where(not(eq(schema.opportunities.tier, 4)))
      .orderBy(desc(schema.opportunities.latestActivityMs))
      .limit(10);
    console.log("Found:", result.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
