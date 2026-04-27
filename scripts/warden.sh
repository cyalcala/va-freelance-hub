#!/bin/bash
export TRIGGER_SECRET_KEY=$(grep TRIGGER_SECRET_KEY .env.local 2>/dev/null | cut -d= -f2)
export TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env.local 2>/dev/null | cut -d= -f2)
export TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env.local 2>/dev/null | cut -d= -f2)

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health || echo "{}")
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo 999)
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo 0)
STATUS=$(echo "$HEALTH" | jq -r '.status // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

STALE=$(awk -v s="$STALENESS" 'BEGIN{print (s > 1) ? 1 : 0}' 2>/dev/null || echo 0)

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

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health || echo "{}")
STALENESS=$(echo "$HEALTH" | jq '.vitals.stalenessHrs // 999' 2>/dev/null || echo 999)
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0' 2>/dev/null || echo 0)

if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] WARN: only $TOTAL active listings (expected >273)"
else
  echo "[WARDEN] OK: $TOTAL active listings"
fi

if awk -v s="$STALENESS" 'BEGIN{exit !(s < 1)}'; then
  echo "[WARDEN] OK: staleness ${STALENESS}hrs"
else
  echo "[WARDEN] WARN: staleness still ${STALENESS}hrs after harvest attempt"
fi

FEED=$(curl -s https://va-freelance-hub-web.vercel.app || echo "")
if echo "$FEED" | grep -q "No matching signals found"; then
  echo "[WARDEN] WARN: empty signal visible to users"
else
  echo "[WARDEN] OK: feed showing content"
fi

LAST_RUN=$(curl -s -X GET \
  "https://api.trigger.dev/api/v3/runs?status=COMPLETED&limit=1" \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  | jq -r '.data[0].updatedAt // "never"' 2>/dev/null || echo "never")
echo "[WARDEN] last completed run: $LAST_RUN"

mkdir -p docs
LOG_LINE="$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=${TOTAL} | status=$STATUS"
echo "$LOG_LINE" >> docs/warden-log.md

echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | $STATUS"
