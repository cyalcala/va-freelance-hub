import type { APIRoute } from "astro";
import {
  companyLogoFallbackSvg,
  parseCompanyLogoRequest,
} from "@/lib/company-logo";

const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const MAX_LOGO_BYTES = 256 * 1024;

function fallbackResponse(initial: string, status = 200): Response {
  return new Response(companyLogoFallbackSvg(initial), {
    status,
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const parsed = parseCompanyLogoRequest(new URL(request.url));
  if (!parsed) return fallbackResponse("?", 400);

  try {
    const faviconUrl = new URL("https://www.google.com/s2/favicons");
    faviconUrl.searchParams.set("domain", parsed.domain);
    faviconUrl.searchParams.set("sz", "64");

    const upstream = await fetch(faviconUrl, {
      headers: { Accept: "image/png,image/x-icon,image/webp,image/jpeg" },
      signal: AbortSignal.timeout(3_000),
    });
    const contentType = (upstream.headers.get("content-type") || "")
      .split(";", 1)[0]
      .toLowerCase();
    const contentLength = Number(upstream.headers.get("content-length") || "0");

    if (
      !upstream.ok ||
      !ALLOWED_IMAGE_TYPES.has(contentType) ||
      (contentLength > 0 && contentLength > MAX_LOGO_BYTES)
    ) {
      return fallbackResponse(parsed.initial);
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_LOGO_BYTES) {
      return fallbackResponse(parsed.initial);
    }

    return new Response(body, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fallbackResponse(parsed.initial);
  }
};
