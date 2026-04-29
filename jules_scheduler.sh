#!/bin/bash
while true; do
  ./jules_warden.sh >> warden.log 2>&1

  if [ -s docs/warden-log.md ]; then
      CURRENT_HOUR=$(date +%H)
      CURRENT_MINUTE=$(date +%M)

      # Commit once per day around midnight (e.g. between 00:00 and 00:30)
      if [ "$CURRENT_HOUR" = "00" ] && [ "$CURRENT_MINUTE" -lt "31" ]; then
          git add docs/warden-log.md
          git diff --cached --quiet || git commit -m "chore: daily warden logs update [VA.INDEX]" || true
      fi
  fi

  sleep 1800
done
