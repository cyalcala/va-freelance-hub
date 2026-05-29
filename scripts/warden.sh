#!/bin/bash
export TRIGGER_SECRET_KEY=$(grep TRIGGER_SECRET_KEY .env.local 2>/dev/null | cut -d= -f2)
export TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env.local 2>/dev/null | cut -d= -f2)
export TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env.local 2>/dev/null | cut -d= -f2)

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo "999")
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo "0")
STATUS=$(echo "$HEALTH" | jq -r '.status // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

STALE=$(awk -v s="$STALENESS" 'BEGIN{print (s > 1) ? 1 : 0}')

if [ "$STALE" = "1" ]; then
  echo "[WARDEN] STALE — triggering manual harvest"

  RUN_ID=$(curl -s -X POST \
    "https://api.trigger.dev/api/v3/tasks/harvest-opportunities/trigger" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d '{"payload": {}}' | jq -r '.id' 2>/dev/null)

  echo "[WARDEN] harvest triggered: $RUN_ID"
  sleep 90

  RESULT=$(curl -s "https://api.trigger.dev/api/v3/runs/$RUN_ID" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    | jq -r '.status' 2>/dev/null)

  echo "[WARDEN] harvest result: $RESULT"

  if [ "$RESULT" = "COMPLETED" ]; then
    echo "[WARDEN] staleness resolved"
  else
    echo "[WARDEN] harvest $RESULT — logging for next cycle"
  fi
else
  echo "[WARDEN] staleness OK (${STALENESS}hrs)"
fi

# Re-fetch health after possible harvest
HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo "999")
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo "0")

FINAL_LOG_STATUS="OK"
WARN_REASON=""

# Check 1: listings exist
if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] WARN: only $TOTAL active listings (expected >273)"
  FINAL_LOG_STATUS="WARN"
  WARN_REASON="low_active_count"
else
  echo "[WARDEN] OK: $TOTAL active listings"
fi

if [ "$TOTAL" -lt 100 ]; then
  echo "🚨 NEEDS HUMAN — Active listing count dropped below 100 (possible data loss)" >> docs/warden-log.md
fi

# Check 2: staleness still OK after harvest attempt
if awk -v s="$STALENESS" 'BEGIN{exit !(s < 1)}'; then
  echo "[WARDEN] OK: staleness ${STALENESS}hrs"
  if [ "$STALE" = "1" ]; then
    FINAL_LOG_STATUS="STALE_FIXED"
  fi
else
  echo "[WARDEN] WARN: staleness still ${STALENESS}hrs after harvest attempt"
  FINAL_LOG_STATUS="STALE_PERSISTS"
  if [ -z "$WARN_REASON" ]; then
      WARN_REASON="staleness_persists"
  else
      WARN_REASON="${WARN_REASON}, staleness_persists"
  fi
fi

# Check 3: feed not showing empty signal
FEED=$(curl -s https://va-freelance-hub-web.vercel.app)
if echo "$FEED" | grep -q "No matching signals found"; then
  echo "[WARDEN] WARN: empty signal visible to users"
  FINAL_LOG_STATUS="WARN"
  if [ -z "$WARN_REASON" ]; then
      WARN_REASON="empty_signal_frontend"
  else
      WARN_REASON="${WARN_REASON}, empty_signal_frontend"
  fi
else
  echo "[WARDEN] OK: feed showing content"
fi

# Check 4: pipeline has a recent completed run
LAST_RUN=$(curl -s -X GET \
  "https://api.trigger.dev/api/v3/runs?status=COMPLETED&limit=1" \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  | jq -r '.data[0].updatedAt // "never"' 2>/dev/null || echo "never")
echo "[WARDEN] last completed run: $LAST_RUN"

LOG_MSG_STATUS="$FINAL_LOG_STATUS"
if [ "$FINAL_LOG_STATUS" = "WARN" ]; then
  LOG_MSG_STATUS="WARN: $WARN_REASON"
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=${TOTAL} | status=${LOG_MSG_STATUS}" >> docs/warden-log.md

# Auto-remediation (Step 5)
if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] Executing Turso audit script due to low listing count..."
  cat > /tmp/quick-audit.ts << 'INNER_EOF'
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
INNER_EOF
  bun run /tmp/quick-audit.ts
fi

echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | ${LOG_MSG_STATUS}"
