import type { APIRoute } from "astro";
import { getDb, opportunities } from "@va-hub/db";
import { sql } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env ?? (import.meta as any).env;

    const authHeader = request.headers.get("Authorization");
    const proxySecret = env.PROXY_SECRET;

    if (!proxySecret || authHeader !== `Bearer ${proxySecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const db = getDb(env);

    // Find duplicates based on descriptionHash
    // Keeping the oldest one (MIN(id)) and returning the rest to delete
    
    // SQLite doesn't support DELETE with JOIN directly, so we use a subquery
    // We want to delete opportunities where the descriptionHash is not null
    // AND its ID is not the minimum ID for that descriptionHash
    
    const result = await db.run(sql`
      DELETE FROM \`opportunities\`
      WHERE \`descriptionHash\` IS NOT NULL
      AND \`id\` NOT IN (
        SELECT MIN(\`id\`)
        FROM \`opportunities\`
        WHERE \`descriptionHash\` IS NOT NULL
        GROUP BY \`descriptionHash\`
      )
    `);

    // We can also prune duplicates by URL just in case
    const urlResult = await db.run(sql`
      DELETE FROM \`opportunities\`
      WHERE \`id\` NOT IN (
        SELECT MIN(\`id\`)
        FROM \`opportunities\`
        GROUP BY \`url\`
      )
    `);

    return new Response(JSON.stringify({ 
      success: true, 
      prunedHashDuplicates: (result as any).meta?.changes ?? 0,
      prunedUrlDuplicates: (urlResult as any).meta?.changes ?? 0
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Prune API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500 });
  }
};
