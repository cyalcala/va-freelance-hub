import { extractActionPlan } from "./gemini-response";

const INGEST_DIGEST_API_URL = process.env.INGEST_DIGEST_API_URL || "http://localhost:4321/api/ingest-digest";
const PROXY_SECRET = process.env.PROXY_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!PROXY_SECRET || !GEMINI_API_KEY) {
  throw new Error("Missing required environment variables (PROXY_SECRET or GEMINI_API_KEY).");
}

const dummyTranscript = `
Hey guys, Nate Herk here. Today I want to talk about how to land a high-paying remote VA job.
Step 1, you need to optimize your LinkedIn profile. Make sure your headline is clear.
Step 2, don't just apply on Upwork. Find the companies directly and send a cold email to the founder.
Step 3, build a portfolio using Notion. It's free and shows you are organized.
Step 4, learn one high-income skill like basic video editing or AI prompting.
Step 5, always over-deliver on your first task.
That's it for today, see you in the next one!
`;

const videoInfo = {
  creatorName: "Nate Herk",
  videoId: "dQw4w9WgXcQ", // dummy
  videoTitle: "How to land a remote VA job in 2026",
  videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  transcriptRaw: dummyTranscript,
  tags: ["VA", "Freelance", "Upwork", "Cold Email"],
};

async function generateActionPlan(prompt: string): Promise<string[]> {
  // Gemini's documented REST contract accepts the key in a header. This keeps
  // it out of request URLs, logs, and proxy history while avoiding the former
  // SDK's vulnerable protobuf dependency tree.
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini request failed with HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Gemini returned a non-JSON response");
  }
  return extractActionPlan(parsed);
}

async function cook() {
  console.log("Starting Sovereign Chef Pulse...");
  console.log(`Processing video: ${videoInfo.videoTitle} by ${videoInfo.creatorName}`);

  const prompt = `
Analyze the following YouTube transcript from an influencer and extract a clear, concise step-by-step action plan.
Return ONLY a JSON array of strings, where each string is an actionable step.

Transcript:
${videoInfo.transcriptRaw}
`;

  const actionPlan = await generateActionPlan(prompt);
  console.log(`Extracted ${actionPlan.length} action-plan step(s).`);

  const result = await fetch(INGEST_DIGEST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PROXY_SECRET}`,
    },
    body: JSON.stringify({ items: [{ ...videoInfo, actionPlan }] }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await result.text();
  if (!result.ok) {
    throw new Error(`Ingest API rejected payload: ${result.status} ${body.slice(0, 300)}`);
  }
  const payload = JSON.parse(body) as { inserted?: unknown; totalReceived?: unknown };
  const inserted = typeof payload.inserted === "number" ? payload.inserted : 0;
  const totalReceived = typeof payload.totalReceived === "number" ? payload.totalReceived : 0;
  console.log(`[PLATED] Successfully inserted ${inserted} new digests out of ${totalReceived} total.`);
}

void cook().catch((error: unknown) => {
  console.error("[CHEF] Burnt dish. Failed to process transcript:", error);
  process.exitCode = 1;
});
