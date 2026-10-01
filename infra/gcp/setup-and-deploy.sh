#!/usr/bin/env bash
# ==============================================================================
# VA Freelance Hub — Automated GCP Provisioning & Deployment Runner
# Unit GCP-01: Candidate Shadow Dispatch Migration
# ==============================================================================
set -euo pipefail

echo "=================================================================="
echo "   VA Freelance Hub: Automated Google Cloud Provisioner"
echo "=================================================================="

# 1. Project Resolution
CURRENT_PROJECT="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}"
if [ -z "$CURRENT_PROJECT" ] || [ "$CURRENT_PROJECT" = "(unset)" ]; then
  echo "==> No active project configured in gcloud. Scanning available projects..."
  FIRST_PROJECT="$(gcloud projects list --format="value(projectId)" 2>/dev/null | head -n 1 || echo "")"
  if [ -n "$FIRST_PROJECT" ]; then
    echo "==> Found existing project: $FIRST_PROJECT"
    gcloud config set project "$FIRST_PROJECT"
    CURRENT_PROJECT="$FIRST_PROJECT"
  else
    NEW_PROJECT="va-hub-$(date +%s)"
    echo "==> Creating new project: $NEW_PROJECT..."
    gcloud projects create "$NEW_PROJECT" --set-as-default
    CURRENT_PROJECT="$NEW_PROJECT"
  fi
else
  echo "==> Active project: $CURRENT_PROJECT"
fi

export GCP_PROJECT_ID="$CURRENT_PROJECT"
export GCP_REGION="${GCP_REGION:-asia-southeast1}"
export PROXY_SECRET="${PROXY_SECRET:-45272b68f7649b33d488598d2d2721278e75916e79adc3f94edac80073f0b336}"

# 2. Billing Verification
echo "==> Checking project billing status..."
BILLING_STATUS="$(gcloud beta billing projects describe "$CURRENT_PROJECT" --format="value(billingEnabled)" 2>/dev/null || echo "False")"
if [ "$BILLING_STATUS" != "True" ]; then
  echo "==> Billing is not yet enabled for $CURRENT_PROJECT. Searching for billing accounts..."
  BILLING_ACCT="$(gcloud beta billing accounts list --format="value(name)" 2>/dev/null | head -n 1 || echo "")"
  if [ -n "$BILLING_ACCT" ]; then
    echo "==> Linking billing account $BILLING_ACCT..."
    gcloud beta billing projects link "$CURRENT_PROJECT" --billing-account="$BILLING_ACCT" || true
  else
    echo "------------------------------------------------------------------"
    echo "NOTICE: Cloud Build and Cloud Run require a billing account linked."
    echo "Even with the Free Tier ($0.00/mo), Google requires billing active."
    echo "If you have not activated the GCP Free Trial, visit:"
    echo "  https://console.cloud.google.com/billing"
    echo "------------------------------------------------------------------"
  fi
else
  echo "==> Billing is active for $CURRENT_PROJECT."
fi

# 3. Execute Unit GCP-01 Deployment (Shadow Dispatch)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$SCRIPT_DIR/deploy-shadow-dispatch.sh"
echo ""
echo ">>> [Unit GCP-01] Deploying Shadow Dispatch..."
"$SCRIPT_DIR/deploy-shadow-dispatch.sh"

# 4. Execute Unit GCP-02 Deployment (Reservoir Lake Publication)
if [ -f "$SCRIPT_DIR/../../.env" ]; then
  export TURSO_DATABASE_URL="${TURSO_DATABASE_URL:-$(grep -E '^TURSO_DATABASE_URL=' "$SCRIPT_DIR/../../.env" | cut -d '=' -f2- | tr -d '\"' | tr -d "'" || echo "")}"
  export TURSO_AUTH_TOKEN="${TURSO_AUTH_TOKEN:-$(grep -E '^TURSO_AUTH_TOKEN=' "$SCRIPT_DIR/../../.env" | cut -d '=' -f2- | tr -d '\"' | tr -d "'" || echo "")}"
fi

chmod +x "$SCRIPT_DIR/deploy-lake-publish.sh"
echo ""
echo ">>> [Unit GCP-02] Deploying Reservoir Lake Publication..."
"$SCRIPT_DIR/deploy-lake-publish.sh"

# 5. Immediate Live Verification
echo ""
echo "=================================================================="
echo "   Running Live Verification Tests"
echo "=================================================================="
echo "--> Testing shadow-dispatch-job..."
gcloud run jobs execute shadow-dispatch-job \
  --region="$GCP_REGION" \
  --project="$CURRENT_PROJECT" \
  --wait

echo ""
echo "--> Testing lake-publish-job..."
gcloud run jobs execute lake-publish-job \
  --region="$GCP_REGION" \
  --project="$CURRENT_PROJECT" \
  --wait

echo ""
echo "=================================================================="
echo "   Execution Logs (Latest)"
echo "=================================================================="
gcloud logging read "resource.type=cloud_run_job" \
  --limit=20 \
  --format="value(textPayload)" \
  --project="$CURRENT_PROJECT" || true

echo ""
echo "=================================================================="
echo "   SUCCESS: Google Cloud is Primary Runtime!"
echo "   - Unit GCP-01: shadow-dispatch-job (hourly @ :53 UTC)"
echo "   - Unit GCP-02: lake-publish-job (hourly @ :47 UTC)"
echo "   - GitHub Actions: Demoted to Standby & Fallback"
echo "=================================================================="
