export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; message: string };

function tooLarge(maxBytes: number): JsonBodyResult {
  return {
    ok: false,
    status: 413,
    message: `Payload too large (max ${maxBytes} bytes)`,
  };
}

function declaredLengthExceeds(request: Request, maxBytes: number): boolean {
  const header = request.headers.get("content-length");
  if (!header || !/^\d+$/.test(header)) return false;
  const length = Number(header);
  return Number.isSafeInteger(length) && length > maxBytes;
}

/**
 * Reads a JSON body with a hard byte budget. Content-Length is only an early
 * rejection hint: clients can omit or lie about it, so stream bytes are counted
 * before decoding as the authoritative limit.
 */
export async function readJsonBodyLimited(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("maxBytes must be a positive safe integer");
  }
  if (declaredLengthExceeds(request, maxBytes)) return tooLarge(maxBytes);

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, message: "Invalid JSON payload" };

  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        return tooLarge(maxBytes);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON payload" };
  }
}
