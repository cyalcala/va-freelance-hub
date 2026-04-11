import { inngest } from "./client";
import { AgenticBridge } from "../../../../../packages/bridge";

/**
 * HEURISTIC LEARNER: Level-5 Autonomous Intelligence
 * Listens for high-fidelity signals to refine static sifter rules.
 */
export const heuristicLearner = inngest.createFunction(
  { 
    id: "heuristic-learner", 
    name: "Heuristic Learner (Back-Prop)",
    triggers: [{ event: "job.sifted" }]
  },
  async ({ event, step }) => {
    const { md5_hash, tier, score, is_compatible, company, title, source } = event.data;
    
    console.log(`🧠 [LEARNING] Analysing signal for heuristic drift: ${title} [${company}]`);

    // We only learn from high-fidelity (Platinum/Gold) or confirmed Toxic (Trash) signals
    if ((tier <= 1 && score > 90) || (tier === 4 && !is_compatible)) {
        await step.run("bridge-learning-cycle", async () => {
            return await AgenticBridge.learn(event.data, source);
        });
        return { status: "processed", learned: true };
    }

    return { status: "skipped", learned: false };
  }
);
