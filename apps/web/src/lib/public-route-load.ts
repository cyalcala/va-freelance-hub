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
  // Live-outage triage (2026-09-27): the name-only redaction made the homepage
  // 503 undiagnosable from function logs. D1/drizzle error messages carry no
  // credentials; keep the public body generic and bound the logged detail.
  const detail = error instanceof Error
    ? `${error.name}: ${String(error.message).slice(0, 300)}`
    : String(error).slice(0, 300);
  console.error("public route data load failed", detail);
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
