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
    lakeClient = createClient({ url, authToken });
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
