#!/bin/bash
# VA.INDEX — WARDEN SCHEDULED TASK
# Priority: fix staleness immediately, then verify health.

mkdir -p docs
touch docs/warden-log.md

### 1. Load credentials and get current state
export TRIGGER_SECRET_KEY=$(grep TRIGGER_SECRET_KEY .env.local 2>/dev/null | cut -d= -f2 || echo "")
export TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env.local 2>/dev/null | cut -d= -f2 || echo "")
export TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env.local 2>/dev/null | cut -d= -f2 || echo "")

if [ -z "$TRIGGER_SECRET_KEY" ] || [ -z "$TURSO_DATABASE_URL" ] || [ -z "$TURSO_AUTH_TOKEN" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=999hrs | active=0 | status=🚨 NEEDS HUMAN — Required env var is missing" >> docs/warden-log.md
    echo "[WARDEN] 🚨 NEEDS HUMAN — Required env var is missing"
    exit 1
fi

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health || echo "{}")
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo 999)
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo 0)
STATUS=$(echo "$HEALTH" | jq -r '.status // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

### 2. STALENESS CHECK — run this before anything else

STALE=$(awk -v s="$STALENESS" 'BEGIN{print (s > 1) ? 1 : 0}')
RESULT="UNKNOWN"

if [ "$STALE" = "1" ]; then
  echo "[WARDEN] STALE — triggering manual harvest"

  RUN_ID=$(curl -s -X POST \
    "https://api.trigger.dev/api/v3/tasks/harvest-opportunities/trigger" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d '{"payload": {}}' | jq -r '.id')

  echo "[WARDEN] harvest triggered: $RUN_ID"
  sleep 90

  RESULT=$(curl -s "https://api.trigger.dev/api/v3/runs/$RUN_ID" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    | jq -r '.status')

  echo "[WARDEN] harvest result: $RESULT"

  if [ "$RESULT" = "COMPLETED" ]; then
    echo "[WARDEN] staleness resolved"
  else
    echo "[WARDEN] harvest $RESULT — logging for next cycle"
  fi
else
  echo "[WARDEN] staleness OK (${STALENESS}hrs)"
fi

### 3. QUICK HEALTH CHECKS — verify the 4 things that matter

# Re-fetch health after possible harvest
HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health || echo "{}")
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo 999)
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo 0)

# Check 1: listings exist
if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] WARN: only $TOTAL active listings (expected >273)"
else
  echo "[WARDEN] OK: $TOTAL active listings"
fi

# Check 2: staleness still OK after harvest attempt
if awk -v s="$STALENESS" 'BEGIN{exit !(s < 1)}'; then
  echo "[WARDEN] OK: staleness ${STALENESS}hrs"
else
  echo "[WARDEN] WARN: staleness still ${STALENESS}hrs after harvest attempt"
fi

# Check 3: feed not showing empty signal
FEED=$(curl -s https://va-freelance-hub-web.vercel.app || echo "")
if echo "$FEED" | grep -q "No matching signals found"; then
  echo "[WARDEN] WARN: empty signal visible to users"
else
  echo "[WARDEN] OK: feed showing content"
fi

# Check 4: pipeline has a recent completed run
LAST_RUN=$(curl -s -X GET \
  "https://api.trigger.dev/api/v3/runs?status=COMPLETED&limit=1" \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  | jq -r '.data[0].updatedAt // "never"' 2>/dev/null || echo "never")
echo "[WARDEN] last completed run: $LAST_RUN"

### 5. EVALUATE ESCALATIONS

NEEDS_HUMAN=0
HUMAN_REASON=""

# Escalation: Active listing count dropped below 100
if [ "$TOTAL" -lt 100 ]; then
    NEEDS_HUMAN=1
    HUMAN_REASON="Listing count dropped below 100 (possible data loss)"
fi

# Escalation: Harvest FAILED or CRASHED (we will check the last 3 runs here to see if 3 in a row failed)
FAILED_RUNS=$(curl -s -X GET \
  "https://api.trigger.dev/api/v3/runs?limit=3" \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  | jq -r '[.data[] | select(.status == "FAILED" or .status == "CRASHED")] | length' 2>/dev/null || echo 0)

if [ "$FAILED_RUNS" -ge 3 ]; then
    NEEDS_HUMAN=1
    HUMAN_REASON="Harvest has failed 3 runs in a row"
fi

if [ "$NEEDS_HUMAN" -eq 1 ]; then
    LOG_STATUS="🚨 NEEDS HUMAN — $HUMAN_REASON"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=${TOTAL} | status=${LOG_STATUS}" >> docs/warden-log.md
    echo "[WARDEN] $LOG_STATUS"
    exit 1
fi

### 6. APPLY KNOWN FIXES (IF NEEDED)

LOG_STATUS="OK"

if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] Doing Turso quick audit due to low listing count..."
cat > /tmp/quick-audit.ts << 'EOF'
import { createClient } from "@libsql/client/http";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
try {
  const [active, visible, gold] = await Promise.all([
    client.execute("SELECT COUNT(*) as c FROM opportunities WHERE is_active = 1"),
    client.execute("SELECT COUNT(*) as c FROM opportunities WHERE is_active = 1 AND is_restricted = 0"),
    client.execute("SELECT COUNT(*) as c FROM opportunities WHERE tier = 'gold' AND is_active = 1"),
  ]);
  console.log("active:", (active.rows[0] as any).c);
  console.log("visible:", (visible.rows[0] as any).c);
  console.log("gold:", (gold.rows[0] as any).c);
} catch (e) {
  console.error("Turso connection failed:", e);
  process.exit(1);
} finally {
  client.close();
}
EOF
  bun run /tmp/quick-audit.ts
  if [ $? -ne 0 ]; then
    LOG_STATUS="🚨 NEEDS HUMAN — Turso connection is failing entirely"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=${TOTAL} | status=${LOG_STATUS}" >> docs/warden-log.md
    echo "[WARDEN] $LOG_STATUS"
    exit 1
  fi
fi

# Determine overall status for log if not escalated
if [ "$LOG_STATUS" = "OK" ]; then
    if [ "$STALE" = "1" ] && [ "$RESULT" = "COMPLETED" ]; then
        LOG_STATUS="STALE_FIXED"
    elif [ "$STALE" = "1" ]; then
        LOG_STATUS="STALE_PERSISTS"
    elif [ "$TOTAL" -lt 273 ] || echo "$FEED" | grep -q "No matching signals found"; then
        LOG_STATUS="WARN: health check failed"
    fi
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=${TOTAL} | status=${LOG_STATUS}" >> docs/warden-log.md
fi

### 7. EXIT

echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | ${LOG_STATUS}"
