# VA Freelance Hub (RemotePH) 🇵🇭

![Astro](https://img.shields.io/badge/Astro-0C1120?style=for-the-badge&logo=astro&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare%20D1-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini%202.5-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

A self-updating, `$0` FinOps aggregator of remote freelance and VA job opportunities specifically tailored for Filipino freelancers. Built as a portfolio project demonstrating advanced agentic engineering, headless data pipelines, and serverless edge architecture.

## 🔗 Live Site
**[https://remoteph-jobs.pages.dev](https://remoteph-jobs.pages.dev)**

---

## 💡 Rationale
The freelance market is highly saturated, and finding legitimate, high-quality VA jobs can be exhausting. Many aggregation platforms charge premium fees, run slow, or require expensive backend scraping infrastructure (like Apify) to stay up to date.

The goal was to build a **blazing-fast, self-maintaining resource hub** that operates completely autonomously at exactly **$0/month**. By combining the power of Edge networks (Cloudflare) with infinite free CI/CD compute (GitHub Actions) and Generative AI (Gemini), we created a fully decoupled "Hybrid Architecture" that scales infinitely without costing a dime.

---

## ✨ Key Features
- **Curated VA Directory**: A carefully filtered list of high-quality, VA-friendly remote companies.
- **Automated Job Scraping ("The Hunter")**: Background workflows automatically scrape remote job boards (RSS & HTML) every 30 minutes, filter out noise, and push clean JSON payloads directly to the edge database.
- **AI-Powered Influencer Digests ("The Chef")**: An automated Gemini 2.5 Flash pipeline that consumes video transcripts and generates strict, actionable JSON action plans for our users.
- **$0 FinOps Guarantee**: No Vercel, no Trigger.dev, no Apify, no expensive databases. Completely reliant on Cloudflare's free tier and GitHub Actions' generously free CI/CD compute minutes.

---

## 🏗️ The Hybrid Architecture (Cloudflare + GitHub Actions)

We moved away from legacy paradigms (Vercel/Next.js + heavy backend cron jobs) and adopted a strictly decoupled edge architecture.

### The Storage Engine (Cloudflare Edge)
- **Frontend Framework**: [Astro](https://astro.build/) (Blazing fast, zero-JS by default)
- **Database**: Cloudflare D1 (Serverless SQLite at the edge)
- **Hosting**: Cloudflare Pages
- **APIs**: Secure, secret-guarded ingest endpoints (`/api/ingest`, `/api/ingest-digest`) living on the edge.

### The Heavy Lifter (GitHub Actions)
Since Cloudflare's free tier has strict 10ms CPU limits, we offloaded all heavy processing (scraping, AI parsing, DOM walking) to GitHub.
- **GitHub Actions (Cron)**: Spins up an Ubuntu runner every 30 minutes.
- **Scraper Scripts**: Fetches massive RSS feeds and DOM structures, processes the data, hashes it for deduplication, and securely `POST`s it to the Astro Edge API.
- **AI Processing**: Connects to the Gemini AI Studio API to generate rich JSON digests.

---

## 🗄️ Project Structure

```text
├── apps/web/                  # Astro UI, D1 Database APIs, & Components
├── scripts/gha/
│   ├── harvest.ts             # "The Hunter" - RSS scraping pipeline
│   └── chef.ts                # "The Chef" - Gemini 2.5 Flash AI transcription pipeline
├── .github/workflows/
│   ├── gha-hunter-pulse.yml   # 30-min scraping cron job
│   ├── gha-chef-pulse.yml     # AI digest cron job
│   └── ci-guardrail.yml       # Production protection via `astro check`
└── packages/db/               # Drizzle Schema definitions
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (`pnpm` recommended)
- A Google AI Studio API Key (`GEMINI_API_KEY`)
- A local Cloudflare D1 configuration

### Setup

```bash
# Clone the repository
git clone https://github.com/cyalcala/va-freelance-hub.git
cd va-freelance-hub

# Install all dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Make sure to add your PROXY_SECRET and GEMINI_API_KEY
```

### Local Development

```bash
# Start the local Astro Edge Server (Port 4321)
npx astro dev --port 4321

# In a separate terminal, test the Scraping Pipeline
pnpm tsx scripts/gha/harvest.ts

# Test the AI Digest Pipeline
pnpm tsx scripts/gha/chef.ts
```

---

## 📜 Historical Context (The Vercel Era)
*Note: This project was originally built on Next.js 14, Turso, and Trigger.dev (Vercel hosting). While that stack was powerful, it was ultimately deprecated in favor of our current Cloudflare/GitHub Actions architecture to strictly adhere to our $0 FinOps mandate and overcome serverless timeout limitations.*

## 👨‍💻 Credits
Built by **[cyalcala](https://github.com/cyalcala)** — Filipino freelance technical writer and agentic engineer.

## 📄 License
MIT