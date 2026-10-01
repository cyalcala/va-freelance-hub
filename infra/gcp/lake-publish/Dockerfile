# Unit GCP-02: Lean container for Cloud Run Job Reservoir Lake Publication
# Base image pinned to exact repository Bun version (1.3.14)
FROM oven/bun:1.3.14-slim AS runner

WORKDIR /app

# 1. Install dependencies from standalone package.json (no monorepo workspace conflicts)
COPY infra/gcp/lake-publish/package.json ./package.json
RUN bun install --production

# 2. Copy application files needed for D1 and Turso synchronization
COPY packages ./packages
COPY apps/web/wrangler.jsonc ./apps/web/wrangler.jsonc
COPY scripts/lake ./scripts/lake
COPY scripts/diagnostics ./scripts/diagnostics
COPY scripts/gcp ./scripts/gcp
COPY scripts/ci ./scripts/ci

# 3. Ensure unprivileged bun user owns the application tree
RUN chown -R bun:bun /app

# 4. Switch to unprivileged bun user for execution
USER bun

ENV NODE_ENV=production

# Entrypoint executes the typed lake publish runner
ENTRYPOINT ["bun", "run", "scripts/gcp/run-lake-publish.ts"]
