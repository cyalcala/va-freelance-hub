import crypto from "crypto";

export interface ServiceAccountKey {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export async function getGcpAccessToken(keyPath = "sa-key.json"): Promise<string> {
  const file = Bun.file(keyPath);
  if (!(await file.exists())) {
    throw new Error(`Service account key not found at ${keyPath}`);
  }
  const key: ServiceAccountKey = await file.json();

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: key.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const b64url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${b64url(header)}.${b64url(payload)}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(key.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;

  const tokenEndpoint = key.token_uri || "https://oauth2.googleapis.com/token";
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to obtain GCP access token: HTTP ${res.status} - ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

if (import.meta.main) {
  try {
    const token = await getGcpAccessToken();
    console.log("Successfully authenticated to GCP! Token prefix:", token.slice(0, 15) + "...");
  } catch (err: any) {
    console.error("Authentication failed:", err.message);
    process.exit(1);
  }
}
