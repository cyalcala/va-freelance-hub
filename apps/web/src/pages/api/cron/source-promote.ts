import type { APIRoute } from "astro";
import { isAuthorized } from "@/lib/auth";
import { nowUtcIso } from "@/lib/time";
import { readJsonBodyLimited } from "@/lib/request-body";
import {
  applyTypedTransition,
  wrapD1Binding,
  type ApplyTypedTransitionRequest,
  type ApplyTypedTransitionResult,
  type TransitionGatewayDatabase,
} from "@va-hub/scraper";

export const prerender = false;

export const SOURCE_PROMOTE_ALLOWLIST = [
  "greenhouse:grafanalabs",
  "recruitee:myjewellery",
  "teamtailor:career.teamtailor.com",
  "greenhouse:gitlab",
  "greenhouse:remotecom",
  "greenhouse:nearform",
  "greenhouse:ghost",
  "greenhouse:canonical",
  "greenhouse:wikimedia",
  "breezy:20four7va",
  "breezy:sourcefit",
  "breezy:time-etc",
  "breezy:vaaphilippines-recruitment",
  "breezy:yokly",
  "breezy:remote-craft",
  "breezy:value-virtual-assistants",
  "workable:coconutva",
  "workable:crewbloom",
  "workable:pearltalent",
  "workable:rocketams",
  "workable:hunt-st",
  "workable:hello-rache",
  "workable:pineapple-staffing",
] as const;

export type SourcePromoteAllowlistId = (typeof SOURCE_PROMOTE_ALLOWLIST)[number];

type HandlerDependencies = {
  applyTransition?: (
    db: TransitionGatewayDatabase,
    request: ApplyTypedTransitionRequest,
  ) => Promise<ApplyTypedTransitionResult>;
  wrapDb?: (d1: unknown) => TransitionGatewayDatabase;
  now?: () => string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function createSourcePromoteHandler(deps: HandlerDependencies = {}): APIRoute {
  const applyTransition = deps.applyTransition ?? applyTypedTransition;
  const wrapDb = deps.wrapDb ?? wrapD1Binding;
  const now = deps.now ?? nowUtcIso;

  return async ({ request, locals }) => {
    const env = (locals.runtime?.env ?? (import.meta as any).env) as any;
    if (!isAuthorized(request, env?.PROXY_SECRET || env?.CRON_SECRET)) {
      return json(401, { error: "Unauthorized" });
    }

    let sourceId: string | null = null;
    let targetOperational: string | null = null;

    if (request.method === "POST") {
      const parsedBody = await readJsonBodyLimited(request, 16 * 1024);
      if (parsedBody.ok && parsedBody.value && typeof parsedBody.value === "object") {
        const payload = parsedBody.value as Record<string, unknown>;
        if (typeof payload.sourceId === "string") {
          sourceId = payload.sourceId.trim();
        }
        if (typeof payload.to === "string") {
          targetOperational = payload.to.trim();
        }
      }
    }

    if (!sourceId) {
      const url = new URL(request.url);
      sourceId = url.searchParams.get("sourceId");
      if (!targetOperational) {
        targetOperational = url.searchParams.get("to");
      }
    }

    if (!sourceId) {
      return json(400, { error: "sourceId is required" });
    }

    if (!SOURCE_PROMOTE_ALLOWLIST.includes(sourceId as any)) {
      return json(400, {
        error: `source ${sourceId} is not in the canary promotion allowlist`,
        sourceId,
      });
    }

    if (!env?.DB) {
      return json(503, { error: "D1 database binding DB is unavailable" });
    }

    try {
      const db = wrapDb(env.DB);
      const currentTime = now();

      const sourceRow = (await env.DB.prepare(
        "SELECT source_id, compliance_state, operational_state, canary_max_new_items_per_tick FROM source_registry WHERE source_id = ?"
      )
        .bind(sourceId)
        .first()) as {
          source_id: string;
          compliance_state: "allowed" | "conditional";
          operational_state: string;
          canary_max_new_items_per_tick: number | null;
        } | null;

      if (!sourceRow) {
        return json(404, { error: `source ${sourceId} not found in source_registry`, sourceId });
      }

      if (sourceRow.operational_state === "active") {
        return json(200, {
          outcome: "already_active",
          sourceId,
        });
      }

      if (targetOperational === "active") {
        if (sourceRow.operational_state !== "canary") {
          return json(409, {
            outcome: "rejected",
            sourceId,
            reason: `source operational state is ${sourceRow.operational_state}; only canary sources can graduate to active`,
          });
        }

        const result = await applyTransition(db, {
          sourceId,
          to: {
            compliance: sourceRow.compliance_state,
            operational: "active",
          },
          cause: "requested_promotion",
          now: currentTime,
        });

        if (!result.persisted) {
          return json(409, {
            outcome: "rejected",
            sourceId,
            reason: result.decision.ok ? "transition not persisted" : result.decision.reason,
          });
        }

        return json(200, {
          outcome: "active",
          sourceId,
          decision: result.decision,
        });
      }

      if (sourceRow.operational_state === "canary") {
        return json(200, {
          outcome: "already_canary",
          sourceId,
          published: 0,
          canaryMaxNewItemsPerTick: sourceRow.canary_max_new_items_per_tick,
        });
      }

      if (sourceRow.operational_state !== "shadow") {
        return json(409, {
          outcome: "rejected",
          sourceId,
          reason: `source operational state is ${sourceRow.operational_state}; only shadow sources can promote to canary`,
        });
      }

      const result = await applyTransition(db, {
        sourceId,
        to: {
          compliance: sourceRow.compliance_state,
          operational: "canary",
        },
        cause: "requested_promotion",
        now: currentTime,
      });

      if (!result.persisted) {
        return json(409, {
          outcome: "rejected",
          sourceId,
          reason: result.decision.ok ? "transition not persisted" : result.decision.reason,
        });
      }

      return json(200, {
        outcome: "canary",
        sourceId,
        published: 0,
        decision: result.decision,
      });
    } catch (err) {
      return json(500, {
        outcome: "error",
        sourceId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

export const POST = createSourcePromoteHandler();
export const GET = createSourcePromoteHandler();
