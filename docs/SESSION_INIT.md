# VA.INDEX Session Initialization Checklist

## Run These Before Every Session

### Step 1 — Read The Rules
- `cat docs/AI_GUARDRAILS.md`
- `cat docs/KNOWN_ISSUES.md`
- `cat CLAUDE.md`

### Step 2 — Check System Health
`curl -s https://va-freelance-hub-web.vercel.app/api/health | jq '.'`

- If **HEALTHY**: proceed normally.
- If **DEGRADED**: run full diagnostic first.
- If **STALE**: check Trigger.dev runs immediately.

### Step 3 —# Agentic SRE Upgrade (The "AI-Armed Sentinel")

This plan outlines the strategy to upgrade the **Apex SRE Interrogator** into a fully autonomous, agentic system powered by **Gemini 1.5 Flash**. The goal is a $0 infrastructure setup that can diagnose, fix, and document architectural issues without human intervention.

## Architectural Overview

### 1. Context Aggregation (The "Senses")
To provide Gemini with full situational awareness, we will implement a `scripts/context-aggregator.ts` utility.
- **Function**: Recursively bundles all source code (`.ts`, `.astro$), schemas, and architectural documents (`ARCHITECTURE.md`, `SESSION_INIT.md`) into a single weighted context string.
- **Optimization**: Uses a `.sentinelignore` file to skip large assets and node_modules.

### 2. Gemini Bridge (The "Rationalization Layer")
A new `scripts/lib/gemini.ts` module will interface with the Google AI Studio SDK.
- **Reasoning**: If a 10-gate certification fails, the Sentinel sends the failed logs + full project context to Gemini.
- **Instructions**: Gemini is prompted to act as a **Senior SRE Architect** and must return a JSON fix protocol.

### 3. Agentic Remediation (The "Hands")
The core `scripts/apex-sre.ts` will be upgraded to handle **Dynamic Fix Protocols**.
- **Execution**: Applies code patches or environment changes suggested by Gemini.
- **Verification**: Immediately re-runs the `triage.ts --certify` suite on the patched code within the GitHub Actions runner.
- **Safe-Commit**: If the gates turn green, the runner uses `git commit` to push the fix back to the repository.

### 4. Automated Audit Trail (The "Memory")
All autonomous actions are recorded in **`CHANGELOG.md`**.
- **Format**: Every fix is logged under a `### [SENTINEL-FIX] [Date]` header, describing the problem, the AI's reasoning, and the specific commit hash.
- **Transparency**: This ensures you can audit the "Robot SRE" actions by looking at the repo history.

## Verification Plan

### Automated Tests
- **Dry-Run Mode**: A special flag `--ai-dry-run` to test Gemini's reasoning without committing code.
- **Conflict Test**: Intentionally breaking a file to see if the Sentinel can correctly diagnose and fix it in a single cycle.

### $0 Infrastructure Audit
- Ensure all API calls stay within Gemini's free tier (15 RPM).
- Verify GHA minutes remain under 2,000/mo.

### Step 4 — Confirm Pipeline Running
`curl -s -X GET "https://api.trigger.dev/api/v3/runs?limit=5" -H "Authorization: Bearer ${TRIGGER_SECRET_KEY}" | jq '[.data[] | {task: .taskIdentifier, status: .status}]'`

### Step 5 — Output Session State
Before doing anything, output:
- **Health**: [HEALTHY/DEGRADED/STALE]
- **Last 5 commits**: [list]
- **Pipeline status**: [green/red counts]
- **Vercel config**: [current vercel.json contents]
- **Any known issues**: [from KNOWN_ISSUES.md]

### Step 6 — Read System Snapshot
- `cat docs/SYSTEM_SNAPSHOT.md`
  (Ensures the agent understands the four timestamp axes and current saturation state before modifying the pipeline).

Only after completing all 6 steps proceed with the actual mission.
