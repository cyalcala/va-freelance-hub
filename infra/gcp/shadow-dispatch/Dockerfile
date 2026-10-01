# Unit GCP-01: Ultra-lean container for Cloud Run Job Shadow Dispatch
# Base image pinned to exact repository Bun version (1.3.14)
FROM oven/bun:1.3.14-slim AS runner

WORKDIR /app

# Ensure unprivileged execution
USER bun

# Copy minimal files required for execution
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun scripts/diagnostics ./scripts/diagnostics
COPY --chown=bun:bun scripts/gcp ./scripts/gcp

# Default environment configurations
ENV NODE_ENV=production
ENV SHADOW_DISPATCH_API_URL="https://remotejobs-ph.pages.dev/api/cron/shadow-dispatch"

# Entrypoint executes the typed shadow runner
ENTRYPOINT ["bun", "run", "scripts/gcp/run-shadow-dispatch.ts"]
