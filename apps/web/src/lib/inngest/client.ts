// MUST be first: shims FinalizationRegistry/WeakRef before `inngest` evaluates.
import "./polyfill";
import { Inngest, Middleware } from "inngest";

/**
 * The Cloudflare Pages bindings a triage function needs at runtime. Pages passes
 * these on the fetch handler's `env` argument — they are NOT globals — so they
 * must be threaded in through middleware (below).
 */
export type CfBindings = ENV;

/**
 * Bridges Cloudflare bindings into Inngest function context.
 *
 * `api/inngest.ts` invokes the cloudflare `serve()` handler workers-style —
 * `(request, env, ctx)` — so `requestArgs[1]` is the Pages `env` (D1, Workers
 * AI, secrets). `wrapRequest` captures it once per request; `transformFunctionInput`
 * injects it onto the function ctx so steps read `ctx.env.DB` / `ctx.env.AI` the
 * same way the cron routes read `locals.runtime.env`. A fresh instance is created
 * per request, so a captured env never leaks between requests.
 */
class CloudflareBindingsMiddleware extends Middleware.BaseMiddleware {
  readonly id = "cloudflare-bindings";
  private env: CfBindings | undefined;

  wrapRequest(args: Middleware.WrapRequestArgs): Promise<Middleware.Response> {
    // cloudflare serve deriveHandlerArgs → [request, env, ctx]; env is index 1.
    this.env = args.requestArgs?.[1] as CfBindings | undefined;
    return args.next();
  }

  transformFunctionInput(
    arg: Middleware.TransformFunctionInputArgs,
  ): Middleware.TransformFunctionInputArgs {
    // Object.assign (not an object literal) side-steps the excess-property check
    // on Context.Any while still widening the ctx with our `env` binding.
    return { ...arg, ctx: Object.assign({}, arg.ctx, { env: this.env }) };
  }
}

/**
 * The Inngest client for this app. `id` is the app slug Inngest syncs under.
 * No event key is set here — the durable-triage pilot is cron-driven, not
 * event-driven, and the signing key is read from Pages env by the serve handler.
 */
export const inngest = new Inngest({
  id: "remotejobs-ph",
  middleware: [CloudflareBindingsMiddleware],
});
