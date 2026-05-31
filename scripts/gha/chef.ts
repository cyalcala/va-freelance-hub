import { GoogleGenAI, Type } from "@google/genai";

const INGEST_DIGEST_API_URL = process.env.INGEST_DIGEST_API_URL || "http://localhost:4321/api/ingest-digest";
const PROXY_SECRET = process.env.PROXY_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!PROXY_SECRET || !GEMINI_API_KEY) {
  console.error("Missing required environment variables (PROXY_SECRET or GEMINI_API_KEY).");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
  tags: ["VA", "Freelance", "Upwork", "Cold Email"]
};

async function cook() {
  console.log("👨‍🍳 Starting Sovereign Chef Pulse...");
  console.log(`Processing video: ${videoInfo.videoTitle} by ${videoInfo.creatorName}`);

  const prompt = `
    Analyze the following YouTube transcript from an influencer and extract a clear, concise step-by-step action plan.
    Return ONLY a JSON array of strings, where each string is an actionable step.
    
    Transcript:
    ${videoInfo.transcriptRaw}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const actionPlan = JSON.parse(response.text || "[]");
    console.log("Extracted Action Plan:", actionPlan);

    const digest = {
      ...videoInfo,
      actionPlan
    };

    console.log("Sending payload to ingest-digest API...");
    const result = await fetch(INGEST_DIGEST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PROXY_SECRET}`
      },
      body: JSON.stringify({ items: [digest] })
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error(`Ingest API rejected payload: ${result.status} ${errorText}`);
      process.exit(1);
    }

    const data: any = await result.json();
    console.log(`✅ [PLATED] Successfully inserted ${data.inserted} new digests out of ${data.totalReceived} total.`);
    
  } catch (e) {
    console.error("❌ [CHEF] Burnt dish. Failed to process transcript:", e);
    process.exit(1);
  }
}

cook().catch(console.error);
