import { createClient, type Client } from "@libsql/client";

let lakeClient: Client | null = null;

export function getLakeClient(): Client {
  if (lakeClient) {
    return lakeClient;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set in environment.");
  }

  lakeClient = createClient({
    url,
    authToken,
  });

  return lakeClient;
}
