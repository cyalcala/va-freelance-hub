#!/bin/bash
while true; do
  ./scripts/warden.sh >> docs/warden.log 2>&1
  sleep 1800
done
