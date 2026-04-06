import { expect, test } from "bun:test";
import dotenv from "dotenv";

dotenv.config();

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || "csk-k62f4c2hv5h28vw2f2xvtfjwkp2nd3mtr8kjvjymwetn9nen";

test.skip("Cerebras API Handshake: Qwen 3 235B Instruct", async () => {
  console.log("[Phase 0] Initiating Cerebras API Handshake...");
  
  const modelsToTry = [
    "qwen-3-235b-a22b-instruct-2507",
    "llama3.3-70b",
    "llama-3.3-70b"
  ];

  let success = false;
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Phase 0] Testing model: ${model}...`);
      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CEREBRAS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Say 'PULSE ACTIVE'" }],
          max_tokens: 10
        }),
        signal: AbortSignal.timeout(15000) // 15s timeout per attempt
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`[Phase 0] Handshake Successful via ${model}. Response:`, data.choices[0].message.content);
        success = true;
        break;
      } else {
        console.warn(`[Phase 0] Model ${model} failed:`, data.error?.message || response.statusText);
      }
    } catch (err) {
      console.warn(`[Phase 0] Attempt with ${model} error or timeout:`, (err as Error).message);
      lastError = err;
    }
  }

  if (!success) {
    throw lastError || new Error("All handshake attempts failed.");
  }
}, 60000); // 60s total test timeout
