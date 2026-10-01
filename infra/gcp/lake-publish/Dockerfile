# Unit GCP-02: Lean container for Cloud Run Job Reservoir Lake Publication
# Base image pinned to exact repository Bun version (1.3.14)
FROM oven/bun:1.3.14-slim AS runner

WORKDIR /app

# Ensure unprivileged execution
USER bun

# Copy application files needed for D1 and Turso synchronization
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun packages ./packages
COPY --chown=bun:bun apps/web/wrangler.jsonc ./apps/web/wrangler.jsonc
COPY --chown=bun:bun scripts/lake ./scripts/lake
COPY --chown=bun:bun scripts/diagnostics ./scripts/diagnostics
COPY --chown=bun:bun scripts/gcp ./scripts/gcp

# Install pinned runtime dependencies directly without workspace coupling
RUN bun add @libsql/client@0.18.0 wrangler@4.143.0 --no-save

ENV NODE_ENV=production

# Entrypoint executes the typed lake publish runner
ENTRYPOINT ["bun", "run", "scripts/gcp/run-lake-publish.ts"]
