// MUST be first: defines FinalizationRegistry/WeakRef before any inngest module
// evaluates (the cloudflare serve import below constructs Inngest's OTel span
// processor, which needs FinalizationRegistry — absent on the Workers runtime).
import "@/lib/inngest/polyfill";
import type { APIRoute } from "astro";
import { serve } from "inngest/cloudflare";
import { inngest } from "@/lib/inngest/client";
import { triageDrain } from "@/lib/inngest/functions/triage-drain";

export const prerender = false;

// Inngest reaches this endpoint to sync functions (PUT), introspect (GET) and
// invoke each step (POST). It is inert to the pipeline until INNGEST_SIGNING_KEY
// is set on the Pages project: without it, Inngest cannot sync/verify and the
// scrape route keeps triaging inline (see scrape.ts `triageViaInngest`). Once
// set, the triage-drain cron here owns triage — one listing per invocation.
// The cloudflare adapter types `env` as a string map and its args as a 1–2
// tuple; we pass the real Pages bindings + execution ctx, whose runtime contract
// (deriveHandlerArgs reads args[0]=request, args[1]=env) we verified from source.
// Cast to the loose call shape we actually invoke.
const handler = serve({
  client: inngest,
  functions: [triageDrain],
}) as unknown as (
  request: Request,
  env: unknown,
  ctx?: unknown,
) => Response | Promise<Response>;

// Astro's APIContext → the workers-style (request, env, ctx) the cloudflare
// adapter expects. Passing `env` this way lets Inngest read INNGEST_SIGNING_KEY
// from Pages secrets, and the client's bindings middleware reads it too
// (requestArgs[1]) to expose D1 + Workers AI to the function steps.
const route: APIRoute = ({ request, locals }) => {
  const runtime = (locals as { runtime?: { env?: unknown; ctx?: unknown } }).runtime;
  return handler(request, runtime?.env ?? {}, runtime?.ctx);
};

export const GET = route;
export const POST = route;
export const PUT = route;
