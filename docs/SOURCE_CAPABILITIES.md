# Source Capability System (Pillar A)

Architectural reference for reusable source capabilities across VA Freelance Hub.

---

## 1. Capability Model vs One-Off Scrapers

Rather than creating hundreds of brittle, one-off scrapers for individual company career sites, VA Freelance Hub abstracts collection into reusable, platform-level **Source Capabilities**:

```text
SourceCapability
  ├── canHandle(candidate: SourceCandidate): boolean
  ├── probe(candidate: SourceCandidate): Promise<ProbeResult>
  ├── fetch(candidate: SourceCandidate): Promise<NormalizedOpportunity[]>
  ├── normalize(rawItem: unknown): NormalizedOpportunity
  └── diagnostics(response: Response | unknown): CapabilityDiagnostics
```

---

## 2. Supported Platforms & Capabilities

### 2.1 Greenhouse Job Board API
- **Endpoint Pattern**: `https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=false`
- **Method**: Public, authentication-free HTTP GET.
- **Payload**: Minimal JSON (`id`, `title`, `absolute_url`, `location.name`, `updated_at`, `offices`, `departments`).
- **Implementation**: `packages/scraper/greenhouse.ts`
- **Status**: Production Qualified (EX-02 Grafana Labs; EX-08 GitLab, Remote.com, Nearform, Ghost).
- **Robots / Policy**: Permitted; complies with standard rate limits; no content scraping.

### 2.2 Lever Postings API
- **Endpoint Pattern**: `https://api.lever.co/v0/postings/{site}`
- **Method**: Documented public REST endpoint.
- **Payload**: Structured JSON with `text`, `hostedUrl`, `categories.location`, `categories.commitment`.
- **Implementation**: `packages/scraper/lever.ts`
- **Status**: Qualified mechanism (EX-06); awaiting live authentic employer token retargeting.

### 2.3 Ashby Job Board API
- **Endpoint Pattern**: `https://api.ashbyhq.com/posting-api/job-board/{board_name}`
- **Method**: Public JSON posting API.
- **Payload**: Clean structured listings with remote flags, secondary locations, and employment types.
- **Implementation**: `packages/scraper/ashby.ts`
- **Status**: Mechanism tested; scheduled for Tier A candidate qualification.

### 2.4 Workable Public Feed
- **Endpoint Pattern**: Documented global multi-employer XML feed.
- **Payload**: XML feed with `title`, `url`, `company`, `location`, `remote`, `job_type`.
- **Implementation**: `packages/scraper/workable.ts` (actively excludes full HTML `<description>`).
- **Status**: Mechanism verified (SP-10); requires GHA preprocessing action (EX-09) due to payload size.

### 2.5 Recruitee Careers API
- **Endpoint Pattern**: `https://api.recruitee.com/c/{company}/careers/offers`
- **Payload**: Structured JSON with clean location, remote status, and tags.
- **Implementation**: `packages/scraper/recruitee.ts`
- **Status**: Shadow admitted (EX-04 My Jewellery).

### 2.6 Teamtailor Careers API
- **Endpoint Pattern**: Carrier JSON feed at `https://{career_domain}/jobs`
- **Payload**: Direct structured postings with department and location metadata.
- **Implementation**: `packages/scraper/teamtailor.ts`
- **Status**: Shadow admitted (EX-05 Teamtailor).

### 2.7 Breezy HR Public JSON API
- **Endpoint Pattern**: `https://{company}.breezy.hr/json`
- **Method**: Public, authentication-free HTTP GET.
- **Payload**: Minimal JSON array with `name`, `url`, `locations`, `salary`, `published_date`, `is_remote`.
- **Implementation**: `packages/scraper/breezy-canary.ts`, `packages/scraper/ats.ts`
- **Status**: Qualified mechanism (EX-BREEZY); allowlisted for shadow admission (20Four7VA, Sourcefit, Time Etc, VAA Philippines).
- **Robots / Policy**: Explicitly allowed by `robots.txt` on career subdomains and `breezy.hr`; minimal discovery metadata only.

### 2.8 Standard RSS 2.0 / Atom / JSON Feeds
- **Payload**: Standard syndicated feeds parsed via fast regex / XML parser.
- **Status**: Active production path for exact-six feeds (`we-work-remotely`, `remotive`, `real-work-from-anywhere`, `remote-ok`, `jobicy`).

---

## 3. Compliance Boundaries

- **No Bypass**: Never bypass logins, CAPTCHAs, paywalls, or rate limits.
- **No Anti-Automation Evasion**: Respect explicit anti-automation directives in `robots.txt` or terms.
- **Minimal Metadata Storage**: Store only discovery metadata (title, company, location, application URL, tags). Never republish entire copyrighted job descriptions.
