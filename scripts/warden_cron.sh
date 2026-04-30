#!/bin/bash
echo "[CRON] Starting Warden scheduled task. Running every 30 minutes (1800s)."

while true; do
  echo "[CRON] $(date -u) | Executing scripts/warden.sh"
  ./scripts/warden.sh
  echo "[CRON] $(date -u) | Cycle complete. Sleeping for 30 minutes."
  sleep 1800
done
