type Fixture = {
  id: string;
  title: string;
  description: string;
  locationRaw: string | null;
  expectedEligible: boolean | null;
  class: "positive" | "hard-negative" | "unclear";
};

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

const MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct-fast",
] as const;

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !accountId) throw new Error("Cloudflare evaluation credentials are required");

const fixtures = await Bun.file(
  new URL("../../packages/scraper/fixtures/ai-geo-eval.json", import.meta.url),
).json() as Fixture[];

function promptFor(fixture: Fixture): string {
  return `You classify remote jobs for a Filipino job board. Decide whether a person living in the Philippines may apply.
Reject non-PH residence, citizenship, work-authorization, onsite/hybrid, local-language, and country/city locks. Accept explicit worldwide, Philippines, and APAC access. Timezone overlap alone is allowed. When evidence is ambiguous, set eligibleForFilipinos to false so publication fails closed.

Title: ${fixture.title}
Source location: ${fixture.locationRaw ?? "not provided"}
Description: ${fixture.description}

Return only the requested JSON.`;
}

const schema = {
  type: "object",
  properties: {
    eligibleForFilipinos: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["eligibleForFilipinos", "reason"],
};

const results: Array<Record<string, unknown>> = [];
for (const model of MODELS) {
  for (const fixture of fixtures) {
    const startedAt = performance.now();
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a precise JSON classifier." },
            { role: "user", content: promptFor(fixture) },
          ],
          response_format: { type: "json_schema", json_schema: schema },
          max_tokens: 180,
          temperature: 0,
        }),
      },
    );
    const body = await response.json() as any;
    if (!response.ok || body?.success !== true) {
      throw new Error(`${model}/${fixture.id}: provider error ${response.status}`);
    }
    const raw = body.result?.response;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (typeof parsed?.eligibleForFilipinos !== "boolean") {
      throw new Error(`${model}/${fixture.id}: missing boolean verdict`);
    }
    results.push({
      model,
      fixtureId: fixture.id,
      class: fixture.class,
      expectedEligible: fixture.expectedEligible,
      predictedEligible: parsed.eligibleForFilipinos,
      reason: String(parsed.reason ?? "").slice(0, 300),
      latencyMs: Math.round(performance.now() - startedAt),
      usage: (body.result?.usage ?? null) as Usage | null,
    });
  }
}

function metrics(model: string) {
  const labeled = results.filter((row) => row.model === model && row.expectedEligible !== null);
  const tp = labeled.filter((row) => row.expectedEligible === true && row.predictedEligible === true).length;
  const fp = labeled.filter((row) => row.expectedEligible === false && row.predictedEligible === true).length;
  const fn = labeled.filter((row) => row.expectedEligible === true && row.predictedEligible === false).length;
  const hardNegativeFalsePositives = labeled.filter(
    (row) => row.class === "hard-negative" && row.predictedEligible === true,
  ).length;
  return {
    model,
    labeled: labeled.length,
    precision: tp + fp === 0 ? 1 : tp / (tp + fp),
    recall: tp + fn === 0 ? 1 : tp / (tp + fn),
    hardNegativeFalsePositives,
  };
}

const summaries = MODELS.map(metrics);
await Bun.write("ai-eval-results.json", JSON.stringify({ generatedAt: new Date().toISOString(), summaries, results }, null, 2));

const baseline = summaries[0];
const replacement = summaries[1];
const accepted = replacement.hardNegativeFalsePositives === 0
  && replacement.precision >= baseline.precision
  && replacement.recall >= baseline.recall;
const markdown = [
  "## Workers AI PH-geo evaluation",
  "",
  "| Model | Precision | Recall | Hard-negative false positives |",
  "| --- | ---: | ---: | ---: |",
  ...summaries.map((item) => `| \`${item.model}\` | ${item.precision.toFixed(3)} | ${item.recall.toFixed(3)} | ${item.hardNegativeFalsePositives} |`),
  "",
  `Release quality gate: **${accepted ? "PASS" : "FAIL"}**`,
  "",
  "Token usage and per-case latency are archived in `ai-eval-results.json`. Account dashboard neuron delta remains a separate manual acceptance datum.",
].join("\n");
console.log(markdown);
if (process.env.GITHUB_STEP_SUMMARY) await Bun.write(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
if (!accepted) process.exitCode = 1;
