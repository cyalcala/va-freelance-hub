#!/usr/bin/env bash
# ==============================================================================
# VA Freelance Hub — Unit GCP-01 Deployment Script
# Provisions Google Cloud Infrastructure for EX-03 Shadow Dispatch Runner
#
# Authority: docs/plans/UNIT_GCP_01_SHADOW_DISPATCH_MIGRATION.md
# Master Operating Constitution v3.0 (Part LXII)
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${GCP_REGION:-asia-southeast1}"
REPOSITORY_NAME="va-hub-runner"
IMAGE_NAME="shadow-dispatch"
JOB_NAME="shadow-dispatch-job"
SCHEDULER_NAME="shadow-dispatch-hourly"
CRON_SCHEDULE="53 * * * *" # Offset by 30 min during shadow evaluation against GHA :23
SERVICE_ACCOUNT_NAME="va-hub-scheduler-invoker"

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "Error: GCP_PROJECT_ID is not set and no active gcloud project found."
  echo "Find your project ID with:    gcloud projects list"
  echo "Or create a new one with:     gcloud projects create <my-project-id> --set-as-default"
  echo "Then set it in gcloud with:   gcloud config set project <my-project-id>"
  echo "Or pass it directly:          GCP_PROJECT_ID=<my-project-id> ./infra/gcp/deploy-shadow-dispatch.sh"
  exit 1
fi

echo "=== VA Freelance Hub: Deploying Unit GCP-01 ==="
echo "Project ID:      $PROJECT_ID"
echo "Region:          $REGION"
echo "Cloud Run Job:   $JOB_NAME"
echo "Cloud Scheduler: $SCHEDULER_NAME ($CRON_SCHEDULE)"
echo ""

# 1. Enable Required GCP APIs
echo "1. Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT_ID"

# 2. Create Artifact Registry Repository if not exists
echo "2. Ensuring Artifact Registry repository exists..."
if ! gcloud artifacts repositories describe "$REPOSITORY_NAME" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="VA Freelance Hub Batch Runner Images" \
    --project="$PROJECT_ID"
fi

IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}:latest"

# 3. Build and Push Container Image via Cloud Build
echo "3. Building container image via Cloud Build..."
gcloud builds submit \
  --tag="$IMAGE_TAG" \
  --project="$PROJECT_ID" \
  --file=infra/gcp/shadow-dispatch/Dockerfile \
  .

# 4. Create Service Account with Least Privilege
echo "4. Ensuring execution service account exists..."
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --display-name="VA Hub Scheduler & Job Invoker" \
    --project="$PROJECT_ID"
fi

# Grant Cloud Run Invoker permission to the service account
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.invoker" \
  --condition=None >/dev/null

# 5. Ensure Secret Manager PROXY_SECRET exists
echo "5. Checking Secret Manager for va-hub-proxy-secret..."
if ! gcloud secrets describe "va-hub-proxy-secret" --project="$PROJECT_ID" >/dev/null 2>&1; then
  if [ -n "${PROXY_SECRET:-}" ]; then
    echo -n "$PROXY_SECRET" | gcloud secrets create "va-hub-proxy-secret" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="$PROJECT_ID"
  else
    echo "Warning: Secret 'va-hub-proxy-secret' does not exist and PROXY_SECRET not passed."
    echo "Create it manually with: echo -n 'YOUR_SECRET' | gcloud secrets create va-hub-proxy-secret --data-file=-"
  fi
fi

# Grant Secret Accessor permission to the service account
gcloud secrets add-iam-policy-binding "va-hub-proxy-secret" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT_ID" >/dev/null 2>&1 || true

# 6. Deploy or Update Cloud Run Job
echo "6. Deploying Cloud Run Job..."
gcloud run jobs deploy "$JOB_NAME" \
  --image="$IMAGE_TAG" \
  --region="$REGION" \
  --cpu="0.5" \
  --memory="512Mi" \
  --max-retries=1 \
  --task-timeout=300s \
  --service-account="$SA_EMAIL" \
  --set-env-vars="SHADOW_DISPATCH_API_URL=https://remotejobs-ph.pages.dev/api/cron/shadow-dispatch,TIMEOUT_MS=60000" \
  --set-secrets="PROXY_SECRET=va-hub-proxy-secret:latest" \
  --project="$PROJECT_ID"

# 7. Configure Cloud Scheduler Job
echo "7. Configuring Cloud Scheduler Job ($CRON_SCHEDULE)..."
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
echo "=== Unit GCP-01 Deployment Complete ==="
echo "Test execution manually with:"
echo "  gcloud run jobs execute $JOB_NAME --region=$REGION --project=$PROJECT_ID --wait"
echo ""
echo "Inspect logs with:"
echo "  gcloud logging read 'resource.type=cloud_run_job AND resource.labels.job_name=$JOB_NAME' --limit=10 --project=$PROJECT_ID"
echo ""
echo "Rollback (pause scheduler) with:"
echo "  gcloud scheduler jobs pause $SCHEDULER_NAME --location=$REGION --project=$PROJECT_ID"
