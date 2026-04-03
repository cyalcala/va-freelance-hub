#!/bin/bash
echo "Starting Warden in the background..."
while true; do
  $(dirname "$0")/warden.sh
  sleep 1800
done
