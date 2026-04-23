#!/bin/bash

# VA.INDEX — WARDEN SCHEDULED TASK
# Runs every 30 minutes indefinitely.

while true; do
  echo "--- Starting WARDEN at $(date -u) ---"
  bash scripts/warden.sh
  echo "--- Sleeping for 30 minutes ---"
  sleep 1800
done
