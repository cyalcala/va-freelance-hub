import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/revalidate
 * Called by Trigger.dev jobs after writing new data to Turso.
 * Triggers Next.js ISR revalidation for all content pages.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");

  if (secret !== process.env.ISR_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/");
  revalidatePath("/opportunities");
  revalidatePath("/directory");

  return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}
