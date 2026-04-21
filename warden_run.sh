#!/bin/bash
export TRIGGER_SECRET_KEY=$(grep TRIGGER_SECRET_KEY .env.local 2>/dev/null | cut -d= -f2)
export TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env.local 2>/dev/null | cut -d= -f2)
export TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env.local 2>/dev/null | cut -d= -f2)

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.dbStalenessHrs // 999')
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0')
STATUS=$(echo "$HEALTH" | jq -r '.status // "UNKNOWN"')

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

STALE=$(awk "BEGIN{print ($STALENESS > 1) ? 1 : 0}")

if [ "$STALE" = "1" ]; then
  echo "[WARDEN] STALE — triggering manual harvest"

  RUN_ID=$(curl -s -X POST \
    "https://api.trigger.dev/api/v3/tasks/harvest-opportunities/trigger" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d '{"payload": {}}' | jq -r '.id')

  if [ "$RUN_ID" = "null" ]; then
    echo "Could not trigger."
    STATUS_LOG="WARN: Trigger missing/failed"
  else
    echo "[WARDEN] harvest triggered: $RUN_ID"
    sleep 90

    RESULT=$(curl -s "https://api.trigger.dev/api/v3/runs/$RUN_ID" \
      -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
      | jq -r '.status')

    echo "[WARDEN] harvest result: $RESULT"

    if [ "$RESULT" = "COMPLETED" ]; then
      echo "[WARDEN] staleness resolved"
      STATUS_LOG="STALE_FIXED"
    else
      echo "[WARDEN] harvest $RESULT — logging for next cycle"
      STATUS_LOG="STALE_PERSISTS"
    fi
  fi
else
  echo "[WARDEN] staleness OK (${STALENESS}hrs)"
  STATUS_LOG="OK"
fi

# Re-fetch health after possible harvest
HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
STALENESS=$(echo "$HEALTH" | jq '.vitals.dbStalenessHrs // 999')
TOTAL=$(echo "$HEALTH" | jq '.vitals.totalActive // 0')

# Check 1: listings exist
if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] WARN: only $TOTAL active listings (expected >273)"
  STATUS_LOG="WARN: low active listings"
else
  echo "[WARDEN] OK: $TOTAL active listings"
fi

# Check 2: staleness still OK after harvest attempt
if awk "BEGIN{exit !($STALENESS < 1)}"; then
  echo "[WARDEN] OK: staleness ${STALENESS}hrs"
else
  echo "[WARDEN] WARN: staleness still ${STALENESS}hrs after harvest attempt"
  STATUS_LOG="WARN: staleness ${STALENESS}hrs"
fi

# Check 3: feed not showing empty signal
FEED=$(curl -s https://va-freelance-hub-web.vercel.app)
if echo "$FEED" | grep -q "No matching signals found"; then
  echo "[WARDEN] WARN: empty signal visible to users"
  STATUS_LOG="WARN: empty feed"
else
  echo "[WARDEN] OK: feed showing content"
fi

# Check 4: pipeline has a recent completed run
LAST_RUN=$(curl -s -X GET \
  "https://api.trigger.dev/api/v3/runs?status=COMPLETED&limit=1" \
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
  | jq -r '.data[0].updatedAt // "never"')
echo "[WARDEN] last completed run: $LAST_RUN"

mkdir -p docs
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | stale=${STALENESS}hrs | active=$TOTAL | status=$STATUS_LOG" >> docs/warden-log.md

echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=$TOTAL | $STATUS_LOG"
