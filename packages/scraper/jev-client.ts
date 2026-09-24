// Workers-portable Jev 1.13 client (OpenRouter System One endpoint).
//
// This mirrors the verified local skill adapter
// (`~/.codex/skills/jev/src/jev/client.cjs`) so the runtime integration makes
// exactly the same request the sanctioned local runner makes:
//   POST https://openrouter.ai/api/v1/systemone
//   { model: "typesafe/jev-1.13", state, questions: { <name>: { type:
//      "choice", instructions, criteria } } }
//   -> { model, answers: { <name>: { choice, confidence, probabilities } },
//        usage }
//
// Hard rules preserved from the verified adapter:
//   - The model MUST be typesafe/jev-1.13 (a dated patch suffix is allowed,
//     matching the local client's regex).
//   - No retries, no failover to any other model or provider. One call.
//   - Provider errors return fixed diagnostic text only — never echo request
//     or response content, because source-derived text is untrusted.
//   - The API key is supplied by the caller's env (Cloudflare secret at
//     runtime, injected process env locally). It is never logged, never
//     returned, and never written anywhere.
//
// Advisory only: an unavailable or invalid Jev answer must degrade to the
// caller's conservative deterministic path, never block ingestion.

export const JEV_MODEL = "typesafe/jev-1.13";
const JEV_MODEL_PATTERN = /^typesafe\/jev-1\.13(?:-\d{8})?$/;
export const JEV_SYSTEMONE_URL = "https://openrouter.ai/api/v1/systemone";

export interface JevChoiceQuestion {
  instructions: string;
  criteria: Record<string, string>;
}

export interface JevJudgeRequest {
  /** The bounded decision to make. */
  task: string;
  /** Task-relevant, non-secret state/observations. */
  state: string;
  /** Policy constraints and context. Source content must never be pasted here. */
  context?: string;
  /** One choice question; criteria needs ≥2 options. */
  questions: Record<string, JevChoiceQuestion>;
  timeoutMs?: number;
}

export interface JevJudgeAnswer {
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface JevJudgeResult {
  ok: boolean;
  model?: string;
  answers?: Record<string, JevJudgeAnswer>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: string;
  status?: number;
  fallback: boolean;
}

const failure = (error: string, status?: number): JevJudgeResult => ({
  ok: false,
  error,
  status,
  fallback: true,
});

function validateAnswers(
  answers: unknown,
  questions: Record<string, JevChoiceQuestion>,
): JevJudgeAnswer[] | null {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const validated: JevJudgeAnswer[] = [];
  for (const [name, question] of Object.entries(questions)) {
    const answer = (answers as Record<string, unknown>)[name];
    if (!answer || typeof answer !== "object") return null;
    const { choice, confidence, probabilities } = answer as Record<string, unknown>;
    if (typeof choice !== "string" || !Object.hasOwn(question.criteria, choice)) return null;
    if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
    if (!probabilities || typeof probabilities !== "object" || Array.isArray(probabilities)) return null;
    const probKeys = Object.keys(probabilities as Record<string, unknown>);
    if (probKeys.length !== Object.keys(question.criteria).length) return null;
    let sum = 0;
    for (const key of probKeys) {
      if (!Object.hasOwn(question.criteria, key)) return null;
      const value = (probabilities as Record<string, unknown>)[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) return null;
      sum += value;
    }
    if (Math.abs(sum - 1) > 0.02) return null;
    validated.push({
      choice,
      confidence,
      probabilities: probabilities as Record<string, number>,
    });
  }
  return validated;
}

/**
 * One bounded System One judgment call. Returns a typed result; never throws.
 * Mirrors the local adapter's single-attempt, fixed-diagnostics contract.
 */
export async function judgeViaJev(
  apiKey: string | undefined,
  request: JevJudgeRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<JevJudgeResult> {
  if (!apiKey) return failure("OPENROUTER_API_KEY is not configured");
  const timeoutMs = request.timeoutMs ?? 15_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000) {
    return failure("timeoutMs must be between 1 and 30000");
  }
  const questionNames = Object.keys(request.questions);
  if (questionNames.length === 0) return failure("questions are required");
  for (const name of questionNames) {
    const question = request.questions[name];
    if (!question || Object.keys(question.criteria ?? {}).length < 2) {
      return failure("each question needs at least two criteria");
    }
  }

  const state = [
    request.task ? `Task: ${request.task}` : "",
    request.context ? `Context: ${request.context}` : "",
    request.state ? `State/Observations:\n${request.state}` : "",
  ].filter(Boolean).join("\n\n");

  const questions: Record<string, unknown> = {};
  for (const [name, question] of Object.entries(request.questions)) {
    questions[name] = {
      type: "choice",
      instructions: question.instructions,
      criteria: question.criteria,
    };
  }

  let response: Response;
  try {
    response = await fetchImpl(JEV_SYSTEMONE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "va-freelance-hub-jev/1.0",
      },
      body: JSON.stringify({ model: JEV_MODEL, state, questions }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return failure("Jev request failed or timed out");
  }
  if (!response.ok) {
    return failure(`OpenRouter request failed (HTTP ${response.status})`, response.status);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return failure("OpenRouter request failed (HTTP 200, invalid JSON)");
  }
  const record = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
  const model = typeof record?.model === "string" ? record.model : "";
  if (!JEV_MODEL_PATTERN.test(model)) {
    return failure("Provider returned an unexpected model");
  }
  const validated = validateAnswers(record?.answers, request.questions);
  if (!validated) {
    return failure("Invalid Jev decision response");
  }
  const usage = record?.usage && typeof record.usage === "object" && !Array.isArray(record.usage)
    ? (record.usage as JevJudgeResult["usage"])
    : undefined;
  const answers: Record<string, JevJudgeAnswer> = {};
  questionNames.forEach((name, index) => {
    answers[name] = validated[index];
  });
  return { ok: true, model, answers, usage, fallback: false };
}
