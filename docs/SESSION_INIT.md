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

### Step 3 — Read Last Working State
- `git log --oneline -5`
- `cat apps/frontend/vercel.json`

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
