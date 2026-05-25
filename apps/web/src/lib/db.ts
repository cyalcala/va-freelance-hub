import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, schema } from "@va-hub/db";

const cfCtx = await getCloudflareContext().catch(() => null);
export const db = getDb(cfCtx?.env);

export const { opportunities, vaDirectory, contentDigests } = schema;
export type { Opportunity, NewOpportunity, VADirectoryEntry, NewVADirectoryEntry, ContentDigest, NewContentDigest } from "@va-hub/db";