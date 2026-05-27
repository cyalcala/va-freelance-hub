<div align="center">
  <h1>VA Freelance Hub 🇵🇭</h1>
  <p><strong>A headless, self-updating job aggregation engine designed specifically for the global Filipino workforce.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Astro-0C1120?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />
    <img src="https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Pages" />
    <img src="https://img.shields.io/badge/Cloudflare_D1-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare D1" />
    <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </p>
  
  <h3><a href="https://remotejobs-ph.pages.dev">View Live Platform</a></h3>
</div>

<br />

## 💡 The Problem

The global freelance market is saturated, fragmented, and exhausting to navigate. For remote professionals—particularly Virtual Assistants and engineers in the Philippines—hunting for legitimate work involves three major pain points:

1. **Geo-Fenced "Remote" Jobs**: Major job boards are cluttered with listings tagged as "Remote" that secretly require the candidate to be based in the US, UK, or EU.
2. **Predatory Aggregators**: Many job hubs charge exorbitant membership fees or lock premium opportunities behind paywalls.
3. **Bloated Infrastructure**: From an engineering standpoint, running a constantly updating web scraper is incredibly expensive, often requiring heavy server clusters or paid services like Apify.

## 🚀 The Solution

VA Freelance Hub solves this by decoupling the scraping infrastructure from the front-end display, creating a **blazing-fast, self-maintaining resource hub** that operates completely autonomously at exactly **$0/month**.

We built a custom algorithm known as **"The Bouncer"**. This algorithm intercepts thousands of raw JSON and XML payloads from global API endpoints, scans the text for hidden residency requirements, and instantly rejects any job that isn't explicitly open to the global workforce or specifically the Philippines.

---

## 🛠️ How It Works (The Architecture)

This platform relies on a modern, highly decoupled Edge Architecture, entirely eliminating legacy servers (and their costs).

*   **The Frontend (Cloudflare Pages + Astro):** A lightning-fast, zero-JS-by-default user interface boasting a pristine, glassmorphic 2026-grade design.
*   **The Database (Cloudflare D1):** A serverless SQLite database living on the edge, ensuring sub-millisecond query times.
*   **The Engine ("The Hunter"):** Since Cloudflare has strict CPU limits, we offloaded the heavy lifting to **GitHub Actions**. Every 30 minutes, an Ubuntu runner spins up, fetches raw APIs from RemoteOK, Remotive, Reddit, and WeWorkRemotely, filters the data through the Bouncer, securely hashes the entries to prevent duplicates, and POSTs the clean payload directly to the Edge API.

---

## 👨‍💻 For HR, Clients & Investors

**Why this project matters:** 
This repository serves as a live demonstration of advanced technical writing, API integration, and product empathy. 
*   **API Mastery:** Demonstrates the ability to parse wildly different payload structures—from messy nested JSON (Reddit) to legacy XML (RSS feeds)—and normalize them into a unified, strongly-typed relational database.
*   **Security & DX:** Employs secure bearer-token API routes and defensive programming to protect the database from unauthorized manipulation.
*   **User-Centric Documentation:** I don't just document what engineers build; I understand the underlying CI/CD pipelines, cron jobs, and database architectures, allowing me to translate deeply complex backend logic into crystal clear, human-readable documentation.

---

## 📖 How to Use the Site

Using VA Freelance Hub is designed to be frictionless.

1. **Browse the Board:** Visit the live site to immediately view the latest, deeply-filtered remote opportunities. No login or sign-up required.
2. **Filter by Niche:** Use the dynamic category buttons (e.g., *Customer Support, Engineering, Marketing*) to instantly filter the masonry grid.
3. **Apply Directly:** Every card contains a verified link taking you directly to the source of the job posting (Reddit, RemoteOK, Remotive), bypassing middle-men entirely.

---

## 💻 Developer Guide: Getting Started Locally

Want to fork this project or contribute? Getting the local environment running is simple.

### Prerequisites
*   Node.js (`pnpm` highly recommended)
*   A Cloudflare account (for D1 local simulation)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/cyalcala/va-freelance-hub.git
cd va-freelance-hub

# Install dependencies via monorepo workspace
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the root directory. You will need a secure proxy secret to allow the local scraper to talk to your local API.

```env
# .env
PROXY_SECRET="your_secure_random_string_here"
```

### 3. Spin Up the Environment

Start the local Astro edge server (which simulates Cloudflare Pages and D1):

```bash
cd apps/web
pnpm run dev
```

The site will now be running at `http://localhost:4321`.

### 4. Trigger the Scraper (The Hunter)

To populate your local database with live jobs, open a new terminal tab and manually trigger the GitHub Action scraper script locally:

```bash
# Make sure you are in the root directory
export INGEST_API_URL="http://localhost:4321/api/ingest"
export PROXY_SECRET="your_secure_random_string_here"

# Execute the scraper
pnpm tsx scripts/gha/harvest.ts
```

Watch the console as it fetches, filters, and securely POSTs dozens of jobs directly into your local UI in real-time.

---

## 👨‍💼 Credits

Architected and documented by **[cyalcala](https://github.com/cyalcala)** — Filipino freelance technical writer and developer advocate.

## 📄 License
MIT License
