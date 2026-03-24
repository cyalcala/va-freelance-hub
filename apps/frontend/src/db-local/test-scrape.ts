import { scrapeOpportunitiesTask } from "../../jobs/scrape-opportunities";
import * as dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
console.log("Triggering local scrape to verify fixes...");
scrapeOpportunitiesTask.run({} as any, { ctx: {} as any } as any)
  .then(res => console.log("Success:", res))
  .catch(err => console.error("Error:", err));
