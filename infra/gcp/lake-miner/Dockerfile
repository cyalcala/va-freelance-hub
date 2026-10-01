# Unit GCP-MINER: Lean container for Cloud Run Job Autonomous Worldwide Lake Miner
# Base image pinned to exact repository Bun version (1.3.14)
FROM oven/bun:1.3.14-slim AS runner

WORKDIR /app

# 1. Install dependencies from standalone package.json (no monorepo workspace conflicts)
COPY infra/gcp/lake-miner/package.json ./package.json
RUN bun install --production

# 2. Copy application files needed for Turso Lake reconciliation and ATS discovery
COPY packages ./packages
COPY scripts/lake ./scripts/lake
COPY scripts/diagnostics ./scripts/diagnostics
COPY scripts/gcp ./scripts/gcp
COPY scripts/ci ./scripts/ci

# 3. Ensure unprivileged bun user owns the application tree
RUN chown -R bun:bun /app

# 4. Switch to unprivileged bun user for execution
USER bun

ENV NODE_ENV=production

# Entrypoint executes the typed lake miner runner
ENTRYPOINT ["bun", "run", "scripts/gcp/run-lake-miner.ts"]
