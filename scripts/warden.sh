#!/bin/bash

# VA.INDEX — WARDEN SCHEDULED TASK
# Runs every 30 minutes indefinitely.
# Priority: fix staleness immediately, then verify health.

export TRIGGER_SECRET_KEY=$(grep TRIGGER_SECRET_KEY .env.local 2>/dev/null | cut -d= -f2)
export TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env.local 2>/dev/null | cut -d= -f2)
export TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env.local 2>/dev/null | cut -d= -f2)

HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
if echo "$HEALTH" | grep -q "DEPLOYMENT_DISABLED"; then
  echo "[WARDEN] DEPLOYMENT_DISABLED"
  STALENESS=999
  TOTAL=0
  STATUS="UNKNOWN"
else
  # check if health is valid json
  if echo "$HEALTH" | jq -e . >/dev/null 2>&1; then
    STALENESS=$(echo "$HEALTH" | jq -r '.vitals.stalenessHrs // 999')
    TOTAL=$(echo "$HEALTH" | jq -r '.vitals.totalActive // 0')
    STATUS=$(echo "$HEALTH" | jq -r '.status // "UNKNOWN"')
  else
    STALENESS=999
    TOTAL=0
    STATUS="UNKNOWN"
  fi
fi

echo "[WARDEN] $(date -u) | status=$STATUS | active=$TOTAL | stale=${STALENESS}hrs"

STALE=$(awk -v stale="$STALENESS" "BEGIN{print (stale > 1) ? 1 : 0}")

if [ "$STALE" = "1" ]; then
  echo "[WARDEN] STALE — triggering manual harvest"

  RUN_ID=$(curl -s -X POST \
    "https://api.trigger.dev/api/v3/tasks/harvest-opportunities/trigger" \
    -H "Authorization: Bearer $TRIGGER_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d '{"payload": {}}')

  if echo "$RUN_ID" | jq -e . >/dev/null 2>&1; then
    RUN_ID=$(echo "$RUN_ID" | jq -r '.id')
  else
    RUN_ID=""
  fi

  echo "[WARDEN] harvest triggered: $RUN_ID"
  sleep 90

  if [ -n "$RUN_ID" ]; then
    RESULT=$(curl -s "https://api.trigger.dev/api/v3/runs/$RUN_ID" \
      -H "Authorization: Bearer $TRIGGER_SECRET_KEY")
    if echo "$RESULT" | jq -e . >/dev/null 2>&1; then
      RESULT=$(echo "$RESULT" | jq -r '.status')
    else
      RESULT=""
    fi
  else
    RESULT=""
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

# Re-fetch health after possible harvest
HEALTH=$(curl -s https://va-freelance-hub-web.vercel.app/api/health)
if echo "$HEALTH" | grep -q "DEPLOYMENT_DISABLED"; then
  STALENESS=999
  TOTAL=0
else
  if echo "$HEALTH" | jq -e . >/dev/null 2>&1; then
    STALENESS=$(echo "$HEALTH" | jq -r '.vitals.stalenessHrs // 999')
    TOTAL=$(echo "$HEALTH" | jq -r '.vitals.totalActive // 0')
  else
    STALENESS=999
    TOTAL=0
  fi
fi

# Check 1: listings exist
if [ "$TOTAL" -lt 273 ]; then
  echo "[WARDEN] WARN: only $TOTAL active listings (expected >273)"
else
  echo "[WARDEN] OK: $TOTAL active listings"
fi

# Check 2: staleness still OK after harvest attempt
if awk -v stale="$STALENESS" "BEGIN{exit !(stale < 1)}"; then
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
  -H "Authorization: Bearer $TRIGGER_SECRET_KEY")

if echo "$LAST_RUN" | jq -e . >/dev/null 2>&1; then
  LAST_RUN=$(echo "$LAST_RUN" | jq -r '.data[0].updatedAt // "never"')
else
  LAST_RUN="never"
fi
echo "[WARDEN] last completed run: $LAST_RUN"

mkdir -p docs
LOG_STATUS="OK"
if [ "$STALE" = "1" ] && [ "$RESULT" = "COMPLETED" ]; then
    LOG_STATUS="STALE_FIXED"
elif [ "$STALE" = "1" ]; then
    LOG_STATUS="STALE_PERSISTS"
fi

if [ "$TOTAL" -lt 273 ]; then
    LOG_STATUS="WARN: low active listings"
fi

if echo "$FEED" | grep -q "No matching signals found"; then
    LOG_STATUS="WARN: empty signal visible to users"
fi

echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') | stale=${STALENESS}hrs | active=${TOTAL} | status=${LOG_STATUS}" >> docs/warden-log.md

echo "[WARDEN] cycle done — $(date -u) | stale=${STALENESS}hrs | active=${TOTAL} | ${LOG_STATUS}"
