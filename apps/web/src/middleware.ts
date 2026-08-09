import { defineMiddleware } from "astro:middleware";
import { applySecurityHeaders } from "@/lib/security-headers";

// Cloudflare Pages `_headers` rules do not cover SSR/API responses. Apply the
// shared policy at Astro's server boundary, while static assets get their own
// Page-level policy in public/_headers.
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  applySecurityHeaders(response.headers);
  return response;
});
