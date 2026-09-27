type PublicResponse = {
  status: number;
  headers: Pick<Headers, "set">;
};

export type PublicLoadResult<T> =
  | { ok: true; value: T }
  | { ok: false; value: null };

/** Classify nested driver failures without logging SQL, bindings or upstream text. */
export function publicDataErrorClass(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    const message = current.message.toLowerCase();
    if (message.includes("too many sql variables")) return "d1_bind_limit";
    if (message.includes("quota") || message.includes("daily limit")) return "d1_quota";
    if (message.includes("no such table") || message.includes("no such column")) return "d1_schema";
    if (message.includes("database is locked") || message.includes("overloaded")) return "d1_busy";
    current = current.cause;
  }
  return null;
}

export function markPublicDataUnavailable(response: PublicResponse, error: unknown): void {
  response.status = 503;
  response.headers.set("Cache-Control", "no-store");
  const classification = publicDataErrorClass(error);
  console.error("public route data load failed", classification ? `Error [${classification}]` : "Error");
}

/**
 * Public D1 failures must never masquerade as an empty, cacheable result.
 * Keep the client response generic and redact the server log to error type so
 * an upstream error message cannot expose a secret in production logs.
 */
export async function loadPublicData<T>(
  response: PublicResponse,
  load: () => Promise<T>,
): Promise<PublicLoadResult<T>> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    markPublicDataUnavailable(response, error);
    return { ok: false, value: null };
  }
}
