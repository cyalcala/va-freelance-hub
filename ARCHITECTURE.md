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

### The Zig Native Engine (`packages/zig-engine` & `packages/zig-parser`)
- **Native Compile Interoperability:** To process vast volumes of raw text arrays faster than native Node.js constraints, we integrated a high-speed compiled layer written in Zig (`match.zig`). This theoretically offloads heavy regex text parsing and tokenizing out of the V8 JS engine, allowing raw HTML strings to be scanned and algorithmically scored for scam vectors in microseconds using memory-safe compilation.

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

### The Deep System Audit Engine (`system-audit.ts`)
- **Cron Cycle:** `0 0 * * *` (Daily at Midnight UTC).
- **The "Rathole" Closer:** Runs a sweeping database correction that autonomously updates jobs mathematically older than 14 days directly to `is_active = 0`.
- **The Sentinel:** Checks if the platform organically successfully populated `> 0` signals over the past 24 hours. If APIs unexpectedly break upstream, the sentinel throws a `logger.error(CRITICAL SILENT FAILURE)` via Trigger.dev infrastructure.
- **Evasion Sweeper:** Conducts a heavy secondary validation sequence looking for complex URL shorteners or obfuscated scam patterns (`t.me` paths) heavily nested in active database bodies.

---

## 4. Frontend Compilation (Astro + Tailwind)
- **View Layer:** Written entirely in **Astro**, prioritizing zero-JavaScript static generation to achieve sub-200ms DOM rendering. 
- **Array Priority Rendering:** In `index.astro`, we implement a native `relevancyBoost` point system right after array instantiation. Based dynamically on the text arrays in `agencies`, the system explicitly binds `+1000 points` to names containing 'Virtual', explicitly forcing the most viable algorithmically scored companies over top of the `hiring_score` parameter globally.
- **Aesthetic Refinement (The Editorial Engine):** Evolved rapidly out of a high-contrast Cyberpunk schema into a `bg-[#F9F8F6]` (Oat) and `text-[#1A237E]` (Deep Blueberry) structure optimized using native CSS viewport-relative media queries applied gracefully upon `.glass-card` elements for fluid mobile deployment.

---

## 5. The Failsafe Subsystem 
To maintain 100% production reliability across highly dynamic deployments, we assembled **The Mythical Restore Engine**.

- **Snapshot CLI (`bun run save`)**: Generates an alphanumeric mythical ID format (`Hydra_2026-03-XX`). Natively connects to the Turso SQL layers to extract table objects mathematically into a raw JSON file pushed strictly inside an ignored `.backups/` directory. Concurrently executes `git tag` routines structurally indexing the raw layout of the filetree.
- **Restoration Hook (`bun run restore`)**: Dynamically rolls Git memory variables back through history, forcefully drops SQL dependencies from `createDb()`, and instantly reconstructs the schema back up natively through JSON injection blocks.
