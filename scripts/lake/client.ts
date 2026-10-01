import { createClient, type Client } from "@libsql/client";

let lakeClient: Client | null = null;

/** True when the minimum Turso credentials are present (no connection made). */
export function isLakeConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

/** Redacts credential-like values from error text before logging. */
function maskCredentials(message: string): string {
  return message
    .replace(/(libsql:\/\/)[^@/\s]+@/gi, "$1***@")
    .replace(/(authToken|token|password)=([^&\s;]+)/gi, "$1=***");
}

export function isTransientLakeError(err: any): boolean {
  if (!err) return false;
  const code = err.code || "";
  const msg = String(err.message || err);
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_SOCKET" ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("fetch failed") ||
    msg.includes("socket hang up") ||
    msg.includes("network error") ||
    msg.includes("Bad Gateway") ||
    msg.includes("Gateway Timeout") ||
    msg.includes("Service Unavailable") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  );
}

function wrapClientWithRetry(raw: Client): Client {
  const retryable = async <T>(fn: () => Promise<T>, opName: string): Promise<T> => {
    let attempt = 0;
    const maxRetries = 4;
    let delayMs = 400;

    while (true) {
      try {
        return await fn();
      } catch (err: any) {
        attempt++;
        if (attempt >= maxRetries || !isTransientLakeError(err)) {
          throw err;
        }
        const jitter = Math.floor(Math.random() * 150);
        console.warn(`  🔄 Lake client transient error on ${opName} (${err?.code || err?.message}), retrying ${attempt}/${maxRetries} in ${delayMs + jitter}ms...`);
        await new Promise((r) => setTimeout(r, delayMs + jitter));
        delayMs *= 2;
      }
    }
  };

  return new Proxy(raw, {
    get(target, prop, receiver) {
      const orig = Reflect.get(target, prop, receiver);
      if (typeof orig === "function" && (prop === "execute" || prop === "batch")) {
        return function (...args: any[]) {
          return retryable(() => orig.apply(target, args), String(prop));
        };
      }
      return orig;
    },
  });
}

export function getLakeClient(): Client {
  if (lakeClient) {
    return lakeClient;
  }

  const url = process.env.TURSO_DATABASE_URL;
  // Auth token is optional for local file: URLs, required for remote libsql:// URLs.
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set in environment.");
  }

  try {
    const raw = createClient({ url, authToken });
    lakeClient = wrapClientWithRetry(raw);
  } catch (err: any) {
    throw new Error(`Failed to create Turso lake client: ${maskCredentials(err?.message || String(err))}`);
  }

  return lakeClient;
}

/** Closes the singleton connection (useful for CLI exit and tests). */
export function closeLakeClient(): void {
  try {
    lakeClient?.close();
  } catch {
    // Close is best-effort; dropping the reference still allows GC.
  }
  lakeClient = null;
}

