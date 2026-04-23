#!/bin/bash

# 1. Load credentials and get current state
export TRIGGER_SECRET_KEY=$(grep TRIGGER_SECRET_KEY .env.local 2>/dev/null | cut -d= -f2)
export TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env.local 2>/dev/null | cut -d= -f2)
export TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env.local 2>/dev/null | cut -d= -f2)

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo "999")
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo "0")
STATUS=$(echo "$HEALTH" | jq -r '.status // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

# 2. STALENESS CHECK — run this before anything else

STALE=$(awk "BEGIN{print ($STALENESS > 1) ? 1 : 0}")

if [ "$STALE" = "1" ]; then
  echo "[WARDEN] STALE — triggering manual harvest"

  RUN_ID=$(curl -s -X POST \
    "https://api.trigger.dev/api/v3/tasks/harvest-opportunities/trigger" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d '{"payload": {}}' | jq -r '.id' 2>/dev/null || echo "UNKNOWN")

  echo "[WARDEN] harvest triggered: $RUN_ID"
  sleep 90

  RESULT=$(curl -s "https://api.trigger.dev/api/v3/runs/$RUN_ID" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    | jq -r '.status' 2>/dev/null || echo "UNKNOWN")

  echo "[WARDEN] harvest result: $RESULT"

  if [ "$RESULT" = "COMPLETED" ]; then
    echo "[WARDEN] staleness resolved"
  else
    echo "[WARDEN] harvest $RESULT — logging for next cycle"
  fi
else
  echo "[WARDEN] staleness OK (${STALENESS}hrs)"
fi

# 3. QUICK HEALTH CHECKS — verify the 4 things that matter

# Re-fetch health after possible harvest
HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo "999")
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo "0")

# Check 1: listings exist
WARN_REASON=""
if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] WARN: only $TOTAL active listings (expected >273)"
  WARN_REASON="only $TOTAL active listings"
else
  echo "[WARDEN] OK: $TOTAL active listings"
fi

# Check 2: staleness still OK after harvest attempt
if awk "BEGIN{exit !($STALENESS < 1)}"; then
  echo "[WARDEN] OK: staleness ${STALENESS}hrs"
else
  echo "[WARDEN] WARN: staleness still ${STALENESS}hrs after harvest attempt"
  WARN_REASON="${WARN_REASON}${WARN_REASON:+, }staleness still ${STALENESS}hrs"
fi

# Check 3: feed not showing empty signal
FEED=$(curl -s https://va-freelance-hub-web.vercel.app)
if echo "$FEED" | grep -q "No matching signals found"; then
  echo "[WARDEN] WARN: empty signal visible to users"
  WARN_REASON="${WARN_REASON}${WARN_REASON:+, }empty signal visible"
else
  echo "[WARDEN] OK: feed showing content"
fi

# Check 4: pipeline has a recent completed run
LAST_RUN=$(curl -s -X GET \
  "https://api.trigger.dev/api/v3/runs?status=COMPLETED&limit=1" \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  | jq -r '.data[0].updatedAt // "never"' 2>/dev/null || echo "never")
echo "[WARDEN] last completed run: $LAST_RUN"

# 4. LOG THE CYCLE RESULT

LOG_STATUS="OK"

if [ -n "$WARN_REASON" ]; then
    LOG_STATUS="WARN: $WARN_REASON"
elif [ "$STALE" = "1" ] && [ "$RESULT" = "COMPLETED" ]; then
    LOG_STATUS="STALE_FIXED"
elif [ "$STALE" = "1" ] && [ "$RESULT" != "COMPLETED" ]; then
    LOG_STATUS="STALE_PERSISTS"
fi

mkdir -p docs
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=${TOTAL} | status=${LOG_STATUS}" >> docs/warden-log.md

# 5. IF SOMETHING IS BROKEN — apply the known fix

if [ -n "$WARN_REASON" ] || [ "$RESULT" != "COMPLETED" ]; then

    # Track consecutive harvest failures (basic heuristic from log)
    FAIL_COUNT=$(tail -n 3 docs/warden-log.md | grep -c "STALE_PERSISTS")
    if [ "$FAIL_COUNT" -ge 3 ] && [ "$STALE" = "1" ]; then
        echo "🚨 NEEDS HUMAN — Harvest failed 3 times in a row and staleness persists" >> docs/warden-log.md
    fi

    # Empty signal on frontend
    if echo "$FEED" | grep -q "No matching signals found"; then
        echo "[WARDEN] INFO: Empty signal on frontend. Wait for next pipeline run or check restricted flags." >> docs/warden-log.md
    fi

    # Listing count dropped below 273 -> Turso audit
    if [ "$TOTAL" -lt 273 ]; then
        if [ "$TOTAL" -lt 100 ]; then
            echo "🚨 NEEDS HUMAN — Active listing count dropped below 100" >> docs/warden-log.md
        else
            echo "[WARDEN] INFO: Running Turso quick audit..."
            cat > /tmp/quick-audit.ts << 'CODE'
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
} finally {
  client.close();
}
CODE
            bun run /tmp/quick-audit.ts >> docs/warden-log.md 2>&1
            # If code was fixed and pushed, we'd do standard git commands here, but just doing audit.
        fi
    fi

    if [[ "$HEALTH" == *"Payment required"* ]] || [[ -z "$HEALTH" ]]; then
         echo "🚨 NEEDS HUMAN — Vercel API down or returning Payment required" >> docs/warden-log.md
    fi
    if [[ -z "$TRIGGER_SECRET_KEY" ]]; then
         echo "🚨 NEEDS HUMAN — TRIGGER_SECRET_KEY missing from environment" >> docs/warden-log.md
    fi
fi

# 6. EXIT
echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | ${LOG_STATUS}"
