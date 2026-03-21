import { fetchRedditJobs } from "./jobs/lib/reddit.ts";

// Patch fetch to use mock server
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  return originalFetch('http://localhost:8080', options);
};

async function run() {
  const start = performance.now();
  const jobs = await fetchRedditJobs();
  const end = performance.now();
  console.log(`Fetched ${jobs.length} jobs in ${(end - start).toFixed(2)} ms`);
  process.exit(0);
}

run();
