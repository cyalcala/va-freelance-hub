# AI Governance: Zero-Cost Autonomy (v2.0)
*Last Audit: 2026-03-31*

This document defines the strict protocols and constraints for using Generative AI (Gemini 1.5 Flash) within the **VA Freelance Hub** ecosystem. These rules are mandatory to maintain **Zero-Cost Autonomy**.

## 1. Strict Quota Enforcement (The Titanium Shield)

The system is hard-coded to respect Gemini 1.5 Flash Free Tier limits. Any bypass of these gates is a critical failure.

- **RPM (Requests Per Minute)**: Max **15**. 
  - **Logic**: `jobs/lib/job-utils.ts` enforces a 4-second mandatory delay stored in `vitals.lockUpdatedAt`.
- **RPD (Requests Per Day)**: Max **1,500** (Soft cap at **1,000** for safety).
  - **Logic**: `checkAndIncrementAiQuota` blocks all AI calls if `aiQuotaCount >= 1000`.

## 2. Minification & Token Efficiency

To minimize latency and prevent token overflow:
- **Minification**: All raw JSON payloads must be minified (strip whitespace, nulls, boilerplate) before being sent to the LLM.
- **Sampling**: Large lists (>50 items) must be sampled to a maximum of 10 items for the "Discovery" step.
- **Prompt Window**: Prompt payloads are hard-capped at **100,000 characters**.

## 3. Matrix A Loop (Self-Correction Invariant)

AI-generated logic (JSONata) must be validated via a closed-loop system:
1. **Discovery**: AI generates a rule.
2. **Verification**: The rule is executed locally against a sample.
3. **Retry**: If the execution throws an error, the error trace is fed back for **exactly one (1) attempt** at self-correction.
4. **Cache**: Only validated rules move to the "Fast Path" database cache.

## 4. Agentic Safety Config

All `getGenerativeModel` calls must use:
- `temperature`: 0.1 (Determinisitc mapping).
- `responseMimeType`: "application/json" (Structural adherence).
- `safetySettings`: Set to `BLOCK_NONE` for harvesting (data extraction is neutral) but `HARM_CATEGORY_HARASSMENT` etc. for content generation.

---
**GOVERNANCE NOTE**: Autonomous agents must prioritize existing cached rules over new AI discovery to preserve quota.
