type PublicResponse = {
  status: number;
  headers: Pick<Headers, "set">;
};

export type PublicLoadResult<T> =
  | { ok: true; value: T }
  | { ok: false; value: null };

export function markPublicDataUnavailable(response: PublicResponse, error: unknown): void {
  response.status = 503;
  response.headers.set("Cache-Control", "no-store");
  console.error("public route data load failed", error instanceof Error ? error.name : "unknown");
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
