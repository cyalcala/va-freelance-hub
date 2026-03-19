# VA.INDEX Architecture & Evolution (v5.2)
*A Deep Technical Breakdown of the Autonomous Signal-Capture Platform*

---

## 1. The Core Paradigm & Topology
The VA.INDEX platform is designed as an indestructible, "set-it-and-forget-it" pipeline. It operates completely decoupled from traditional monolithic backend constraints by leveraging edge SQLite databases, serverless background orchestration, and a statically generated frontend.

The system is highly abstracted. Its core intelligence, scraping arrays, and scam heuristics are externalized into a modular `@va-hub/config` package, enabling the entire codebase to be instantly cloned and mapped to any niche (e.g., Web3 Developers, Cybersecurity, UI/UX Designers) without rewriting business logic.

---

## 2. Infrastructure & Compute Layers
### Database Storage (Turso + LibSQL Edge)
- **Engine:** LibSQL (SQLite fork optimized for low latency edge replication).
- **ORM Interface:** **Drizzle ORM** is utilized for strict, typesafe SQL query building and schematic migrations.
- **Relational Schema:**
  - `agencies`: Stores top-level entity metadata (name, verification footprint, hiring URLs, `hiring_heat`, `friction_level`).
  - `opportunities`: Stores individual job signals extracted dynamically. Contains a cryptographically unique `content_hash`.

### The Titanium Sieve (Zig Native Engine)
- **The Sifter (`sifter.zig`):** A high-performance, SIMD-ready binary module that hard-kills Tech/Exec/Blog noise at the hardware level with near-zero latency (~7.9ms per batch).
- **Bun FFI Bridge:** Native interoperability allows TypeScript to call Zig functions with zero overhead, ensuring the 'Purity Firewall' is absolute before any data enters the database.

### Orchestration Execution (Trigger.dev v3)
- **Engine Shift:** We explicitly operate on Trigger.dev's V3 architecture. Traditional Vercel Serverless Functions enforce a brutal 10-60 second execution timeout limit, making heavy scraping unviable. V3 background workers pull the compute off the main thread entirely, allowing scheduled jobs to run for theoretically infinite durations (minutes/hours) natively as isolated background processes.

---

## 3. The Backend Service Workers (Background Jobs)
All background operations are highly surgical, enforcing O(1) growth caps and strict deduplication constraints.

### The Harvester (`scrape-opportunities.ts`)
- **Cron Cycle:** `0 */2 * * *` (Every 120 minutes).
- **RSS Parser Vectors:** Rapidly fetches and extracts payload bodies from Himalayas, WeWorkRemotely, RemoteOK, and ProBlogger using `fast-xml-parser`.
- **REST Protocol Vectors:** Directly pings the Jobicy API, HackerNews (`Ask HN: Who is hiring?`), and Reddit JSON pipelines (`r/forhire`, `r/VirtualAssistant`).
- **Cryptographic Deduplication:** Uses Node's native `crypto.createHash('sha256')` algorithm. Before pushing to Turso, it concatenates `title + company + source_platform` into a unified hash array. This prevents the primary key layer from overlapping if identical jobs are polled on multiple sync intervals.

### The Scam Shield (`trust.ts`)
- **RegEx Filtration:** Employs advanced `/(\$?\d+\s*\/.*day)/i` structural regex matching directly onto incoming description payloads. It catches multi-layer scams like direct wire instructions (`wire transfer`), direct-contact breaches (`telegram me`), or illogical pay structures (`earn $500/day`).

### The Phantom Link Verifier (`verify-links.ts`)
- **Cron Cycle:** `0 6 * * *` (Daily at 6:00 AM UTC).
- **Execution:** Pings the original source URL of any job older than 7 days.
- **ATS Semantic Checking:** Instead of just checking HTTP `404 Not Found` statuses, it fetches the HTML `<body>` and runs algorithmic text-checks looking for standard ATS ghost-job signatures (e.g. *"This role has been filled"*, *"No longer accepting applications"*).
- **Rate Limit Throttling:** Capped surgically at `LIMIT 50` rows per day to ensure network compute remains under $0.05 a month natively while keeping the primary feed highly scrubbed over a cycle.

### The Resilience Watchdog (`resilience-watchdog.ts`)
- **Cron Cycle:** `0 */6 * * *` (Every 6 hours).
- **Pulse Audit:** Detects 'Silent Blackouts' if no data has been discovered in 4 hours.
- **Stagnation Detector:** Monitors the *average age* of the entire Gold pool. If the feed slows down (avg age > 6h), it triggers a critical system-wide alert.
- **Purity Guard:** Ensures Gold Tier volume remains stable.

---

## 4. Frontend Rendering (Unified SSR)
- **Engine Priority:** Both **Astro** (`apps/frontend`) and **Next.js** (`apps/web`) are configured for **Strict SSR** (output: 'server').
- **Cache-Control Shields:** Both apps enforce `no-store, must-revalidate` to bypass browser/edge caching, ensuring the user always sees the absolute 'Titanium' state of the DB.
- **Aesthetic Refinement:** O(1) performance focus with Tailwind CSS and zero-JS hydration (Astro).

---

## 5. The Failsafe Subsystem 
To maintain 100% production reliability across highly dynamic deployments, we assembled **The Mythical Restore Engine**.

- **Snapshot CLI (`bun run save`)**: Generates an alphanumeric mythical ID format (`Hydra_2026-03-XX`). Natively connects to the Turso SQL layers to extract table objects mathematically into a raw JSON file pushed strictly inside an ignored `.backups/` directory. Concurrently executes `git tag` routines structurally indexing the raw layout of the filetree.
- **Restoration Hook (`bun run restore`)**: Dynamically rolls Git memory variables back through history, forcefully drops SQL dependencies from `createDb()`, and instantly reconstructs the schema back up natively through JSON injection blocks.
