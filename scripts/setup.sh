#!/bin/bash

# Filipino Agency Index - Expert Setup Script
echo "🚀 Starting Filipino Agency Index Setup..."

# 1. Install Dependencies
echo "📦 Installing dependencies with Bun..."
bun install

# 2. Build Zig Deduplication Engine
echo "⚡ Building Zig matching engine..."
if command -v zig >/dev/null 2>&1; then
    cd packages/zig-engine
    zig build-exe match.zig -O ReleaseSafe
    cd ../..
    echo "✅ Zig binary built successfully."
else
    echo "❌ Zig not found. Please install Zig (https://ziglang.org) to enable high-speed deduplication."
fi

# 3. Database Migration & Seeding
echo "🗄️ Running Drizzle migrations..."
bun run db:generate
bun run db:migrate

echo "🌱 Ingesting default companies from CSV..."
bun run packages/db/seed-csv.ts

# 4. Success
echo "✨ Setup complete! Run 'bun dev' to start the aggregator and dashboard."
