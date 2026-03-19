import { db } from "../packages/db/client";
import { agencies, opportunities } from "../packages/db/schema";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";

const creatures = [
  "Phoenix", "Dragon", "Griffin", "Chimera", "Leviathan", 
  "Pegasus", "Hydra", "Kraken", "Manticore", "Sphinx", 
  "Valkyrie", "Cerberus", "Minotaur", "Basilisk", "Wyvern"
];

function generateName() {
  const creature = creatures[Math.floor(Math.random() * creatures.length)];
  const date = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${creature}_${date}`;
}

async function run() {
  const args = process.argv.slice(2);
  const isAutomated = args.includes("--automated");
  const customMsg = args.find((_, i) => args[i - 1] === "--msg");

  const name = generateName();
  console.log(`\n🛡️  Initiating ${isAutomated ? "Automated " : ""}System Restore Point: ${name}...`);
  if (customMsg) console.log(`   [Context]: ${customMsg}`);

  const backupDir = ".backups";
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir);
  }

  try {
    // 1. Snapshot DB
    console.log("-> 1. Capturing Database Snapshot...");
    const allAgencies = await db.select().from(agencies);
    const allOpportunities = await db.select().from(opportunities);
    
    const dbDump = {
      agencies: allAgencies,
      opportunities: allOpportunities,
    };

    const filePath = `${backupDir}/${name}.json`;
    writeFileSync(filePath, JSON.stringify(dbDump, null, 2));
    console.log(`   [✓] Database securely saved to ${filePath}`);

    // 2. Snapshot Codebase (Git)
    if (!isAutomated) {
      console.log("-> 2. Locking Codebase State...");
      try {
        execSync('git add .', { stdio: 'ignore' });
        execSync(`git commit -m "Auto-Save: System Restore Point ${name}"`, { stdio: 'ignore' });
      } catch {
        // It's perfectly fine if there is nothing new to commit.
      }
    } else {
      console.log("-> 2. Linking Snapshot to Commit...");
    }

    execSync(`git tag -a ${name} -m "System Restore Point"`);
    console.log(`   [✓] Codebase locked to tag: ${name}`);

    console.log(`\n✅ Restore Point [${name}] Created Successfully.`);
    console.log(`   To restore to this point later, run: bun run restore ${name}\n`);

  } catch (err) {
    console.error(`\n❌ Restore Point Creation Failed:`, err);
  }
}

run();
