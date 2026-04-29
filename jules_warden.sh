#!/bin/bash

# Ensure docs directory exists
mkdir -p docs
touch docs/warden-log.md

export TRIGGER_SECRET_KEY=$(grep TRIGGER_SECRET_KEY .env.local 2>/dev/null | cut -d= -f2 | tr -d '\r')
export TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env.local 2>/dev/null | cut -d= -f2 | tr -d '\r')
export TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env.local 2>/dev/null | cut -d= -f2 | tr -d '\r')

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo "999")
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo "0")
STATUS=$(echo "$HEALTH" | jq -r '.status // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

# Read state
STATE_FILE=".warden-state.json"
CONSECUTIVE_FAILURES=$(jq '.consecutive_harvest_failures // 0' "$STATE_FILE" 2>/dev/null || echo "0")

STALE=$(awk "BEGIN{print ($STALENESS > 1) ? 1 : 0}")
NEEDS_HUMAN=0
STATUS_MSG="OK"

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
    CONSECUTIVE_FAILURES=0
  else
    echo "[WARDEN] harvest $RESULT — logging for next cycle"
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))

    if [ "$RESULT" = "FAILED" ] || [ -z "$RESULT" ] || [ "$RESULT" = "null" ]; then
      echo "🚨 NEEDS HUMAN — Harvest FAILED or CRASHED. Check task logs, look for env var or DB connection error. Missing env vars must be set manually." >> docs/warden-log.md
      NEEDS_HUMAN=1
      STATUS_MSG="WARN: harvest failed"
    fi
  fi
else
  echo "[WARDEN] staleness OK (${STALENESS}hrs)"
  CONSECUTIVE_FAILURES=0
fi

# Write state
echo "{\"consecutive_harvest_failures\": $CONSECUTIVE_FAILURES}" > "$STATE_FILE"

# Escalations
if [ "$CONSECUTIVE_FAILURES" -ge 3 ] && [ "$(awk "BEGIN{print ($STALENESS > 2) ? 1 : 0}")" = "1" ]; then
  echo "🚨 NEEDS HUMAN — Harvest has failed 3 runs in a row with the same error and staleness is > 2hrs." >> docs/warden-log.md
  NEEDS_HUMAN=1
  STATUS_MSG="WARN: repeated harvest failures"
fi

if [ "$TOTAL" -lt 100 ]; then
  echo "🚨 NEEDS HUMAN — Active listing count dropped below 100 (possible data loss)." >> docs/warden-log.md
  NEEDS_HUMAN=1
  STATUS_MSG="WARN: data loss"
fi

# 3. QUICK HEALTH CHECKS
HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo "999")
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo "0")

if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] WARN: only $TOTAL active listings (expected >273)"

  if [ "$NEEDS_HUMAN" = "0" ]; then
    echo "[WARDEN] Running Turso quick audit due to low listing count..."
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

  STATUS_MSG="WARN: count low"
else
  echo "[WARDEN] OK: $TOTAL active listings"
fi

if awk "BEGIN{exit !($STALENESS < 1)}"; then
  echo "[WARDEN] OK: staleness ${STALENESS}hrs"
  if [ "$STALE" = "1" ]; then
    STATUS_MSG="STALE_FIXED"
  fi
else
  echo "[WARDEN] WARN: staleness still ${STALENESS}hrs after harvest attempt"

  if [ "$CONSECUTIVE_FAILURES" -ge 2 ]; then
     echo "[WARDEN] Staleness persists after 2 harvest attempts. Check schedules endpoint and re-enable if inactive."
  fi

  if [ "$STATUS_MSG" = "OK" ] || [ "$STATUS_MSG" = "STALE_FIXED" ]; then
      if [ "$STALE" = "1" ]; then
        STATUS_MSG="STALE_PERSISTS"
      else
        STATUS_MSG="WARN: staleness high"
      fi
  fi
fi

FEED=$(curl -s https://va-freelance-hub-web.vercel.app)
if echo "$FEED" | grep -q "No matching signals found"; then
  echo "[WARDEN] WARN: empty signal visible to users"
  echo "[WARDEN] Verify is_active = 1 AND is_restricted = 0 count in Turso."
  if [ "$STATUS_MSG" = "OK" ]; then
    STATUS_MSG="WARN: empty feed"
  fi
else
  echo "[WARDEN] OK: feed showing content"
fi

LAST_RUN=$(curl -s -X GET \
  "https://api.trigger.dev/api/v3/runs?status=COMPLETED&limit=1" \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  | jq -r '.data[0].updatedAt // "never"' 2>/dev/null || echo "never")
echo "[WARDEN] last completed run: $LAST_RUN"

# Automated fixes section. This checks docs/KNOWN_ISSUES.md to apply simple known logic.
if [ "$STATUS_MSG" != "OK" ] && [ "$STATUS_MSG" != "STALE_FIXED" ] && [ "$NEEDS_HUMAN" = "0" ]; then
  echo "[WARDEN] Applying known fix for status: $STATUS_MSG"
  # This part is a placeholder for automatic code generation logic
  # if needed by reading docs/KNOWN_ISSUES.md.
  # For now, we simulate an automatic fix via git if it applied one.

  # if applied_fix; then
  #   git add -A
  #   git commit -m "fix: [what broke] — [what you did] [VA.INDEX]"
  #   git push origin main
  # fi
  true
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=${TOTAL} | status=${STATUS_MSG}" >> docs/warden-log.md

echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | [${STATUS_MSG}]"
