#!/bin/bash

# 1. Load credentials and get current state
export TRIGGER_SECRET_KEY=${TRIGGER_SECRET_KEY:-$(grep TRIGGER_SECRET_KEY .env.local 2>/dev/null | cut -d= -f2)}
export TURSO_DATABASE_URL=${TURSO_DATABASE_URL:-$(grep TURSO_DATABASE_URL .env.local 2>/dev/null | cut -d= -f2)}
export TURSO_AUTH_TOKEN=${TURSO_AUTH_TOKEN:-$(grep TURSO_AUTH_TOKEN .env.local 2>/dev/null | cut -d= -f2)}

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq -e '.vitals.stalenessHrs // 999' 2>/dev/null || echo 999)
TOTAL=$(echo "$HEALTH" | jq -e '.vitals.totalActive // 0' 2>/dev/null || echo 0)
STATUS=$(echo "$HEALTH" | jq -re '.status // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

# 2. STALENESS CHECK
STALE=$(awk -v s="$STALENESS" 'BEGIN{print (s > 1) ? 1 : 0}')

if [ "$STALE" = "1" ]; then
  echo "[WARDEN] STALE — triggering manual harvest"

  if [ -n "$TRIGGER_SECRET_KEY" ]; then
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
  else
      echo "[WARDEN] WARN: TRIGGER_SECRET_KEY not set. Cannot trigger harvest."
      RESULT="FAILED"
  fi

  echo "[WARDEN] harvest result: $RESULT"

  if [ "$RESULT" = "COMPLETED" ]; then
    echo "[WARDEN] staleness resolved"
  else
    echo "[WARDEN] harvest $RESULT — logging for next cycle"
  fi
else
  echo "[WARDEN] staleness OK (${STALENESS}hrs)"
fi

# 3. QUICK HEALTH CHECKS
HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq -e '.vitals.stalenessHrs // 999' 2>/dev/null || echo 999)
TOTAL=$(echo "$HEALTH" | jq -e '.vitals.totalActive // 0' 2>/dev/null || echo 0)

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
FEED=$(curl -s https://va-freelance-hub-web.vercel.app)
if echo "$FEED" | grep -q "No matching signals found"; then
  echo "[WARDEN] WARN: empty signal visible to users"
else
  echo "[WARDEN] OK: feed showing content"
fi

# Check 4: pipeline has a recent completed run
if [ -n "$TRIGGER_SECRET_KEY" ]; then
    LAST_RUN=$(curl -s -X GET \
      "https://api.trigger.dev/api/v3/runs?status=COMPLETED&limit=1" \
      -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
      | jq -r '.data[0].updatedAt // "never"' 2>/dev/null)
else
    LAST_RUN="never"
fi
echo "[WARDEN] last completed run: $LAST_RUN"

# 4. LOG THE CYCLE RESULT
mkdir -p docs

# Determine STATUS_MSG for log
STATUS_MSG="OK"
if [ "$TOTAL" -lt 273 ] || ! awk -v s="$STALENESS" 'BEGIN{exit !(s < 1)}' || echo "$FEED" | grep -q "No matching signals found"; then
  if ! awk -v s="$STALENESS" 'BEGIN{exit !(s < 1)}'; then
    if [ "$STALE" = "1" ]; then
      STATUS_MSG="STALE_PERSISTS"
    else
      STATUS_MSG="WARN: stale"
    fi
  elif [ "$TOTAL" -lt 273 ]; then
    STATUS_MSG="WARN: listings below 273"
  else
    STATUS_MSG="WARN: empty signal visible"
  fi
elif [ "$STALE" = "1" ]; then
  STATUS_MSG="STALE_FIXED"
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=${TOTAL} | status=${STATUS_MSG}" >> docs/warden-log.md


# 5. IF SOMETHING IS BROKEN - check triggers and run quick audit if needed
if [ "$STATUS_MSG" != "OK" ] && [ "$STATUS_MSG" != "STALE_FIXED" ]; then
    echo "[WARDEN] checking for recoverable conditions..."
    if [ "$TOTAL" -lt 273 ]; then
        echo "[WARDEN] applying Turso quick audit check..."
        if [ -n "$TURSO_DATABASE_URL" ] && [ -n "$TURSO_AUTH_TOKEN" ]; then
            cat > /tmp/quick-audit.ts << 'IN_EOF'
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
  console.error("audit error", e);
} finally {
  client.close();
}
IN_EOF
            bun run /tmp/quick-audit.ts || true
        else
            echo "[WARDEN] Missing TURSO credentials. Cannot run quick audit."
        fi
    fi
    if [ "$STALE" = "1" ] && [ "$RESULT" != "COMPLETED" ]; then
        # Check for 3 consecutive failures by inspecting the log
        # Note: the log writes "STALE_PERSISTS" when harvest fails and staleness > 1
        CONSECUTIVE_FAILURES=$(tail -n 3 docs/warden-log.md | grep -c "STALE_PERSISTS" || echo 0)
        if [ "$CONSECUTIVE_FAILURES" -ge 2 ]; then
            # Since the current run is also a failure, >= 2 means 3 total
            echo "🚨 NEEDS HUMAN - Harvest has failed 3 runs in a row, staleness still >1hrs. Check trigger logs/env vars." >> docs/warden-log.md
        fi
    fi
fi

# Write STATUS_MSG to a file for GHA to read
echo "$STATUS_MSG" > /tmp/warden_status.txt

# 6. EXIT
echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | ${STATUS_MSG}"
