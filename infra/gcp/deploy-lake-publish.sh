#!/usr/bin/env bash
# ==============================================================================
# VA Freelance Hub — Unit GCP-02 Deployment Script
# Provisions Google Cloud Infrastructure for Reservoir Lake Publication Runner
#
# Authority: docs/plans/UNIT_GCP_02_LAKE_PUBLISH_MIGRATION.md
# Master Operating Constitution v3.0 (Part LXII)
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${GCP_REGION:-asia-southeast1}"
REPOSITORY_NAME="va-hub-runner"
IMAGE_NAME="lake-publish"
JOB_NAME="lake-publish-job"
SCHEDULER_NAME="lake-publish-hourly"
CRON_SCHEDULE="47 * * * *"
SERVICE_ACCOUNT_NAME="va-hub-scheduler-invoker"

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "Error: GCP_PROJECT_ID is not set and no active gcloud project found."
  exit 1
fi

echo "=== VA Freelance Hub: Deploying Unit GCP-02 ==="
echo "Project ID:      $PROJECT_ID"
echo "Region:          $REGION"
echo "Cloud Run Job:   $JOB_NAME"
echo "Cloud Scheduler: $SCHEDULER_NAME ($CRON_SCHEDULE)"
echo ""

# 1. Ensure Artifact Registry repository exists
if ! gcloud artifacts repositories describe "$REPOSITORY_NAME" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="VA Freelance Hub Batch Runner Images" \
    --project="$PROJECT_ID"
fi

IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:latest"

# 2. Build and Push Container Image via Cloud Build
echo "1. Building lake-publish container image via Cloud Build..."
if ! gcloud builds submit \
  --config=infra/gcp/lake-publish/cloudbuild.yaml \
  --substitutions=_IMAGE_TAG="$IMAGE_TAG" \
  --project="$PROJECT_ID" \
  .; then
  echo ""
  echo "=================================================================="
  echo "   CLOUD BUILD LOGS (Error Details)"
  echo "=================================================================="
  LATEST_BUILD="$(gcloud builds list --limit=1 --format='value(id)' --project="$PROJECT_ID")"
  gcloud builds log "$LATEST_BUILD" --project="$PROJECT_ID" || true
  exit 1
fi

# 3. Ensure Service Account exists
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --display-name="VA Hub Scheduler & Job Invoker" \
    --project="$PROJECT_ID"
fi

# 4. Helper function to ensure Secret Manager secret exists and is accessible
ensure_secret() {
  local secret_name="$1"
  local env_val="${2:-}"

  if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    if [ -n "$env_val" ]; then
      echo "Creating secret $secret_name in Secret Manager..."
      echo -n "$env_val" | gcloud secrets create "$secret_name" \
        --data-file=- \
        --replication-policy="automatic" \
        --project="$PROJECT_ID"
    else
      echo "Warning: Secret '$secret_name' does not exist and no value was provided."
    fi
  else
    # Update version if value provided
    if [ -n "$env_val" ]; then
      echo -n "$env_val" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID" >/dev/null 2>&1 || true
    fi
  fi

  # Grant Secret Accessor with retry
  for i in {1..5}; do
    if gcloud secrets add-iam-policy-binding "$secret_name" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
      break
    fi
    sleep 3
  done
}

echo "2. Ensuring Secret Manager credentials..."
ensure_secret "va-hub-proxy-secret" "${PROXY_SECRET:-}"
ensure_secret "va-hub-turso-database-url" "${TURSO_DATABASE_URL:-}"
ensure_secret "va-hub-turso-auth-token" "${TURSO_AUTH_TOKEN:-}"
ensure_secret "va-hub-cloudflare-api-token" "${CLOUDFLARE_API_TOKEN:-}"
ensure_secret "va-hub-cloudflare-account-id" "${CLOUDFLARE_ACCOUNT_ID:-}"

# 5. Deploy Cloud Run Job
echo "3. Deploying Cloud Run Job $JOB_NAME..."
gcloud run jobs deploy "$JOB_NAME" \
  --image="$IMAGE_TAG" \
  --region="$REGION" \
  --cpu="1" \
  --memory="512Mi" \
  --max-retries=1 \
  --task-timeout=300s \
  --service-account="$SA_EMAIL" \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="PROXY_SECRET=va-hub-proxy-secret:latest,TURSO_DATABASE_URL=va-hub-turso-database-url:latest,TURSO_AUTH_TOKEN=va-hub-turso-auth-token:latest,CLOUDFLARE_API_TOKEN=va-hub-cloudflare-api-token:latest,CLOUDFLARE_ACCOUNT_ID=va-hub-cloudflare-account-id:latest" \
  --project="$PROJECT_ID"

# 6. Configure Cloud Scheduler
echo "4. Configuring Cloud Scheduler Job ($CRON_SCHEDULE)..."
if gcloud scheduler jobs describe "$SCHEDULER_NAME" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$SCHEDULER_NAME" \
    --location="$REGION" \
    --schedule="$CRON_SCHEDULE" \
    --time-zone="UTC" \
    --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
    --http-method=POST \
    --oauth-service-account-email="$SA_EMAIL" \
    --project="$PROJECT_ID"
else
  gcloud scheduler jobs create http "$SCHEDULER_NAME" \
    --location="$REGION" \
    --schedule="$CRON_SCHEDULE" \
    --time-zone="UTC" \
    --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
    --http-method=POST \
    --oauth-service-account-email="$SA_EMAIL" \
    --project="$PROJECT_ID"
fi

echo ""
echo "=== Unit GCP-02 Deployment Complete ==="
echo "Test execution manually with:"
echo "  gcloud run jobs execute $JOB_NAME --region=$REGION --project=$PROJECT_ID --wait"
echo ""
echo "Inspect logs with:"
echo "  gcloud logging read 'resource.type=cloud_run_job AND resource.labels.job_name=$JOB_NAME' --limit=10 --project=$PROJECT_ID"
