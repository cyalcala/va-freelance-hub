import { sanitizeSourceUrl } from "@va-hub/scraper";
import { normalizeUtcIso } from "@/lib/time";

const MAX_ITEMS = 200;
const MAX_CREATOR_NAME = 200;
const MAX_VIDEO_ID = 128;
const MAX_VIDEO_TITLE = 500;
const MAX_TRANSCRIPT = 80_000;
const MAX_ACTION_PLAN_ITEMS = 30;
const MAX_ACTION_PLAN_ITEM = 1_000;
const MAX_TAGS = 30;
const MAX_TAG = 100;

export type DigestInsert = {
  creatorName: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  transcriptRaw: string | null;
  actionPlan: string[];
  tags: string[];
  publishedAt: string | null;
  processedAt: string;
};

export type DigestItemsResult =
  | { ok: true; items: DigestInsert[] }
  | { ok: false; message: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function optionalString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  const normalized = requiredString(value, maxLength);
  return normalized ?? undefined;
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) return undefined;
  const normalized = value.map((entry) => requiredString(entry, maxLength));
  return normalized.every((entry): entry is string => entry !== null) ? normalized : undefined;
}

function normalizeDigest(item: unknown, processedAt: string): DigestInsert | string {
  const input = asRecord(item);
  if (!input) return "must be an object";

  const creatorName = requiredString(input.creatorName, MAX_CREATOR_NAME);
  if (!creatorName) return "creatorName must be a non-empty string within the size limit";

  const videoId = requiredString(input.videoId, MAX_VIDEO_ID);
  if (!videoId) return "videoId must be a non-empty string within the size limit";

  const videoTitle = requiredString(input.videoTitle, MAX_VIDEO_TITLE);
  if (!videoTitle) return "videoTitle must be a non-empty string within the size limit";

  const videoUrl = sanitizeSourceUrl(input.videoUrl);
  if (!videoUrl) return "videoUrl must be a safe public HTTP(S) URL";

  const transcriptRaw = optionalString(input.transcriptRaw, MAX_TRANSCRIPT);
  if (transcriptRaw === undefined) return "transcriptRaw must be a non-empty string within the size limit when supplied";

  const actionPlan = stringList(input.actionPlan, MAX_ACTION_PLAN_ITEMS, MAX_ACTION_PLAN_ITEM);
  if (!actionPlan) return "actionPlan must contain only non-empty strings";

  const tags = stringList(input.tags, MAX_TAGS, MAX_TAG);
  if (!tags) return "tags must contain only non-empty strings";

  const publishedAt = input.publishedAt === undefined || input.publishedAt === null
    ? null
    : normalizeUtcIso(input.publishedAt);
  if (input.publishedAt !== undefined && input.publishedAt !== null && !publishedAt) {
    return "publishedAt must be a valid date when supplied";
  }

  return {
    creatorName,
    videoId,
    videoTitle,
    videoUrl,
    transcriptRaw,
    actionPlan,
    tags,
    publishedAt,
    processedAt: normalizeUtcIso(input.processedAt) ?? processedAt,
  };
}

/** Validates every item before starting D1 work, avoiding partial digest writes. */
export function parseDigestItems(payload: unknown, processedAt: string): DigestItemsResult {
  const body = asRecord(payload);
  if (!body || !Array.isArray(body.items)) {
    return { ok: false, message: "Invalid payload format. Expected { items: [...] }" };
  }
  if (body.items.length > MAX_ITEMS) {
    return { ok: false, message: "Payload items count exceeds safety limit (max 200)" };
  }

  const items: DigestInsert[] = [];
  for (const [index, item] of body.items.entries()) {
    const normalized = normalizeDigest(item, processedAt);
    if (typeof normalized === "string") {
      return { ok: false, message: `Invalid digest item at index ${index}: ${normalized}` };
    }
    items.push(normalized);
  }
  return { ok: true, items };
}
