import type { APIRoute } from "astro";
import { isAuthorized } from "@/lib/auth";

export const prerender = false;

const ALLOWED_MODELS = new Set([
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct-fast",
]);

/** One-call, authenticated evaluation adapter used by the manual AI gate. */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  if (!isAuthorized(request, env.PROXY_SECRET || env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { model?: unknown; prompt?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (typeof body.model !== "string" || !ALLOWED_MODELS.has(body.model)) {
    return new Response("Unsupported model", { status: 400 });
  }
  if (typeof body.prompt !== "string" || body.prompt.length === 0 || body.prompt.length > 4_000) {
    return new Response("Invalid prompt", { status: 400 });
  }

  try {
    const result = await env.AI.run(body.model, {
      messages: [
        { role: "system", content: "You are a precise JSON classifier." },
        { role: "user", content: body.prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 180,
      temperature: 0,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message.slice(0, 300) : "Workers AI evaluation failed" },
      { status: 502 },
    );
  }
};
