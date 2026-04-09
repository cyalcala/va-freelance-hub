import { config } from "../packages/config";

type Budget = {
  githubMinutesPerRun: number;
  githubIncludedMinutesPerMonth: number;
  cloudflareIncludedRequestsPerDay: number;
  cloudflareIncludedCpuMsPerDay: number;
  githubRunsPerDay: number;
  cloudflareRunsPerDay: number;
  hunterUrlsPerRun: number;
  aiExtractionsPerRun: number;
  avgAiCallsPerExtraction: number;
  inngestEventsPerJob: number;
  budgetMode: "normal" | "tight";
};

const budgetMode = (process.env.BUDGET_MODE || "normal") as "normal" | "tight";

const budget: Budget = {
  githubMinutesPerRun: Number(process.env.GH_MIN_PER_RUN || 1.5),
  githubIncludedMinutesPerMonth: Number(process.env.GH_INCLUDED_MIN_PER_MONTH || 2000),
  cloudflareIncludedRequestsPerDay: Number(process.env.CF_REQ_PER_DAY || 100000),
  cloudflareIncludedCpuMsPerDay: Number(process.env.CF_CPU_MS_PER_DAY || 3600000),
  githubRunsPerDay: budgetMode === "tight" ? 24 : Number(process.env.GH_RUNS_PER_DAY || 48), 
  cloudflareRunsPerDay: budgetMode === "tight" ? 96 : Number(process.env.CF_RUNS_PER_DAY || 144), 
  hunterUrlsPerRun: Number(process.env.HUNTER_URLS_PER_RUN || 1), 
  aiExtractionsPerRun: budgetMode === "tight" ? 8 : Number(process.env.AI_EXTRACT_PER_RUN || 15), 
  avgAiCallsPerExtraction: Number(process.env.AI_CALLS_PER_EXTRACT || 2), 
  inngestEventsPerJob: Number(process.env.INNGEST_EVENTS_PER_JOB || 2), 
  budgetMode,
};

const feedsConfigured = config.rss_sources.length + config.json_sources.length + 5; 
const githubMinutesDay = budget.githubMinutesPerRun * budget.githubRunsPerDay;
const githubMinutesMonth = githubMinutesDay * 30;
const githubPctOfMonthlyFree = (githubMinutesMonth / budget.githubIncludedMinutesPerMonth) * 100;

const cloudflareRequestsDay = budget.cloudflareRunsPerDay * budget.hunterUrlsPerRun;
const cloudflareSubrequestsDay = cloudflareRequestsDay * 4;
const cloudflareCpuMsDay = cloudflareRequestsDay * 150;

const aiCallsDay = budget.cloudflareRunsPerDay * budget.aiExtractionsPerRun * budget.avgAiCallsPerExtraction;
const inngestEventsDay = budget.cloudflareRunsPerDay * budget.aiExtractionsPerRun * budget.inngestEventsPerJob;

// Weekly Headroom Logic (Goldilocks requirement)
const aiCallsWeek = aiCallsDay * 7;
const inngestEventsWeek = inngestEventsDay * 7;
const githubMinutesWeek = githubMinutesDay * 7;

console.log("=== V12 Goldilocks: Free Tier Budget Calibration ===");
console.log(`Mode: ${budget.budgetMode.toUpperCase()}`);
console.log(`Configured feed endpoints: ${feedsConfigured}`);
console.log(`Cadence: GH ${budget.githubRunsPerDay}/day, CF ${budget.cloudflareRunsPerDay}/day`);
console.log("");

console.log("[Weekly Consumption Forecast]");
console.log(`- GitHub Minutes: ${githubMinutesWeek.toFixed(1)} / ${(budget.githubIncludedMinutesPerMonth / 4).toFixed(0)} (est. weekly limit)`);
console.log(`- AI Extractions: ${aiCallsWeek}`);
console.log(`- Inngest Events: ${inngestEventsWeek}`);
console.log("");

console.log("[GitHub Actions (Monthly)]");
console.log(`- Est. usage: ${githubPctOfMonthlyFree.toFixed(1)}% of free tier`);
console.log(githubPctOfMonthlyFree > 100
  ? "⚠️  EXCEEDS free tier. Reducing GH_RUNS_PER_DAY recommended."
  : "✅ Within free tier.");

console.log("");
console.log("[Cloudflare Worker (Daily)]");
console.log(`- Requests: ${(cloudflareRequestsDay / budget.cloudflareIncludedRequestsPerDay * 100).toFixed(1)}%`);
console.log(`- CPU: ${(cloudflareCpuMsDay / budget.cloudflareIncludedCpuMsPerDay * 100).toFixed(1)}%`);
console.log(
  cloudflareRequestsDay > budget.cloudflareIncludedRequestsPerDay ||
  cloudflareCpuMsDay > budget.cloudflareIncludedCpuMsPerDay
    ? "⚠️  EXCEEDS free tier."
    : "✅ Within free tier."
);

console.log("");
console.log("[Trigger.dev Headroom]");
console.log("- Remediations/day: Est. 2-4 (based on Goldilocks 15m audit)");
console.log("- Note: Remediation cooldown is set to preserve Trigger.dev credits.");
