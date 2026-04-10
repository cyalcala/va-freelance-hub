import { db } from "../packages/db/client";
import { opportunities } from "../packages/db/schema";
import { like } from "drizzle-orm";

async function checkMetadata(traceId: string) {
  const [job] = await db.select()
    .from(opportunities)
    .where(like(opportunities.metadata, `%${traceId}%`))
    .limit(1);

  if (!job) {
    console.log(`Job with trace ID ${traceId} not found.`);
    return;
  }

  console.log("Job Metadata:");
  console.log(JSON.stringify(JSON.parse(job.metadata as string), null, 2));
}

const traceId = process.argv[2];
if (!traceId) {
  console.log("Usage: bun run scratch/check_metadata.ts <traceId>");
} else {
  checkMetadata(traceId).catch(console.error);
}
