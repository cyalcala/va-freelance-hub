# AI Governance: Gemini 1.5 Flash Free Tier

This document defines the strict protocols and constraints for using Generative AI within the **VA Freelance Hub** ecosystem. These rules are mandatory to maintain **Zero-Cost Autonomy**.

## 1. Strict Quota Enforcement

The system is hard-coded to respect Gemini 1.5 Flash Free Tier limits:
- **RPM (Requests Per Minute)**: Max **15**. 
  - Implementation: `jobs/lib/job-utils.ts` enforces a 4-second delay stored in `vitals.lockUpdatedAt`.
- **RPD (Requests Per Day)**: Max **1,500** (we cap at **1,000** for safety).
  - Implementation: `jobs/lib/job-utils.ts` blocks all AI calls if `aiQuotaCount >= 1000`.

## 2. Minification Protocol

Gemini 1.5 Flash has a large context window, but to minimize token usage and latency:
- **Minification**: Use `minifyPayload()` in `autonomous-harvester.ts`. 
- **Boilerplate Removal**: Strip whitespace, null values, and repeating boilerplate.
- **Sampling**: Large datasets (>50 items) should be sampled to 10 items for the "Discovery" step. 
- **Character Cap**: Hard limit of **100,000 characters** per prompt.

## 3. Matrix A Loop (Self-Correction)

AI is powerful but fallible. All AI-generated code (JSONata) must be validated before becoming part of the "Fast Path" cache:
- **Discovery**: AI generates a rule.
- **Verification**: Run `jsonata.evaluate()` on the raw payload.
- **Retry**: If verification fails, re-feed the error message to the AI for **one (1) attempt** at self-correction.
- **Fallback**: If self-correction fails, the source is marked as DEGRADED. **DO NOT** loop indefinitely.

## 4. Safety and Filter Settings

Ensure all calls to `getGenerativeModel` use the **POST-SRE Safety Configuration**:
- `temperature`: 0.1 (Precision over creativity).
- `responseMimeType`: "application/json" (Strict structural adherence).

---

**Policy Note**: Any code change that bypasses the `checkAndIncrementAiQuota` gate is considered a **Blocking Security Violation**.
