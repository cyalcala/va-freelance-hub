#!/bin/bash
export TRIGGER_SECRET_KEY=$(grep TRIGGER_SECRET_KEY .env.local | cut -d= -f2)
export TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env.local | cut -d= -f2)
export TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env.local | cut -d= -f2)

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999')
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0')
STATUS=$(echo "$HEALTH" | jq -r '.status // "UNKNOWN"')

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

STALE=$(awk "BEGIN{print ($STALENESS > 1) ? 1 : 0}")

mkdir -p docs
FAIL_COUNT_FILE="docs/warden-fails.txt"
if [ ! -f "$FAIL_COUNT_FILE" ]; then
  echo "0" > "$FAIL_COUNT_FILE"
fi
FAIL_COUNT=$(cat "$FAIL_COUNT_FILE")

SHOULD_EXIT="0"

if [ "$TOTAL" -lt 100 ]; then
  echo "[WARDEN] 🚨 NEEDS HUMAN — active listing count dropped below 100 ($TOTAL)"
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') | stale=${STALENESS}hrs | active=$TOTAL | status=🚨 NEEDS HUMAN" >> docs/warden-log.md
  echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | 🚨 NEEDS HUMAN"
  SHOULD_EXIT="1"
fi

if [ "$SHOULD_EXIT" = "0" ]; then
  if [ "$STALE" = "1" ]; then
    if [ "$FAIL_COUNT" -ge 3 ] && awk "BEGIN{exit !($STALENESS > 2)}"; then
      echo "[WARDEN] 🚨 NEEDS HUMAN — 3 consecutive failures and staleness > 2hrs"
      echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') | stale=${STALENESS}hrs | active=$TOTAL | status=🚨 NEEDS HUMAN" >> docs/warden-log.md
      echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | 🚨 NEEDS HUMAN"
      SHOULD_EXIT="1"
    fi

    if [ "$SHOULD_EXIT" = "0" ]; then
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
        echo "0" > "$FAIL_COUNT_FILE"
      else
        echo "[WARDEN] harvest $RESULT — logging for next cycle"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo "$FAIL_COUNT" > "$FAIL_COUNT_FILE"
      fi
    fi
  else
    echo "[WARDEN] staleness OK (${STALENESS}hrs)"
    echo "0" > "$FAIL_COUNT_FILE"
  fi
fi

if [ "$SHOULD_EXIT" = "0" ]; then
  # Re-fetch health after possible harvest
  HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
  STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999')
  TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0')

  # Check 1: listings exist
  if [ "$TOTAL" -lt 273 ]; then
    echo "[WARDEN] WARN: only $TOTAL active listings (expected >273)"

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
  else
    echo "[WARDEN] OK: $TOTAL active listings"
  fi

  # Check 2: staleness still OK after harvest attempt
  if awk "BEGIN{exit !($STALENESS < 1)}"; then
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
  LAST_RUN=$(curl -s -X GET \
    "https://api.trigger.dev/api/v3/runs?status=COMPLETED&limit=1" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    | jq -r '.data[0].updatedAt // "never"')
  echo "[WARDEN] last completed run: $LAST_RUN"

  if [ "$STALE" = "1" ]; then
    LOG_STATUS="STALE_PERSISTS"
    if awk "BEGIN{exit !($STALENESS < 1)}"; then LOG_STATUS="STALE_FIXED"; fi
  else
    LOG_STATUS="OK"
  fi
  if [ "$TOTAL" -lt 273 ] || echo "$FEED" | grep -q "No matching signals found"; then LOG_STATUS="WARN: count or signal"; fi

  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') | stale=${STALENESS}hrs | active=$TOTAL | status=$LOG_STATUS" >> docs/warden-log.md

  echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | $LOG_STATUS"
fi
