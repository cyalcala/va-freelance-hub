import { fetchHNJobs } from "./jobs/lib/hackernews";
import { performance } from "perf_hooks";

async function run() {
  const start = performance.now();
  await fetchHNJobs();
  const end = performance.now();
  console.log(`fetchHNJobs took ${end - start} ms`);
}

run();
