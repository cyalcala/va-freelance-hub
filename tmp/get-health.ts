import { createDb } from "../packages/db/client";
import { systemHealth } from "../packages/db/schema";

async function run() {
  const { db, client } = createDb();
  try {
    const results = await db.select().from(systemHealth);
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await client.close();
  }
}

run();
