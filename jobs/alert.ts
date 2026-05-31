import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function sendAlert(message: string) {
  console.log("[alert]", message);
  
  const alertsFilePath = path.join(process.cwd(), 'docs', 'scraper-alerts.md');
  const timestamp = new Date().toISOString();
  
  // Create file if it doesn't exist
  if (!fs.existsSync(alertsFilePath)) {
    const header = "# Scraper Alerts Log\n\nThis file automatically logs scraper failures so the AI has a trail of what broke without needing to bother the human.\n\n";
    fs.writeFileSync(alertsFilePath, header);
  }

  // Append the alert
  const logEntry = `- **[${timestamp}]**: ${message}\n`;
  fs.appendFileSync(alertsFilePath, logEntry);

  // Automatically commit and push to GitHub so the AI can read it later
  try {
    await execAsync(`git add ${alertsFilePath}`);
    // Check if there are changes to commit
    const { stdout } = await execAsync('git status --porcelain');
    if (stdout.includes('scraper-alerts.md')) {
      await execAsync(`git commit -m "chore(scraper): auto-logged scraper alert"`);
      await execAsync(`git push`);
      console.log("[alert] Automatically documented failure in GitHub.");
    }
  } catch (err: any) {
    console.error("[alert] Failed to document in GitHub:", err.message);
  }
}
