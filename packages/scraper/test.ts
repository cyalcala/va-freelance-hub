import { fetchATSFeed } from "./ats";

async function main() {
  const jobs = await fetchATSFeed("lever", "figma", "Figma");
  console.log("Figma Lever jobs:", jobs.length);
  if (jobs.length > 0) {
    console.log(jobs[0]);
  }
}
main();
