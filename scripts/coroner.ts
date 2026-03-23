#!/usr/bin/env bun
/**
 * VA.INDEX Deployment Coroner
 * Fetches all errored deployments and extracts the failure logs.
 */

import { $ } from "bun";

async function getFailedDeployments() {
  console.log("Searching for failed deployments...");
  
  // Use Vercel CLI to get JSON list of ERROR deployments
  // Note: Replace 'your-project-name' if not linked
  try {
    const output = await $`npx vercel list va-freelance-hub --status ERROR --json`.text();
    return JSON.parse(output);
  } catch (e) {
    console.error("Error fetching deployments:", e.message);
    return [];
  }
}

async function inspectFailures() {
  const failures = await getFailedDeployments();

  if (failures.length === 0) {
    console.log("✅ No failed deployments found or could not fetch list.");
    return;
  }

  console.log(`\nFound ${failures.length} failed deployments. Analyzing...\n`);

  for (const deploy of failures) {
    console.log(`--- Failed Deployment: ${deploy.url} ---`);
    console.log(`Created: ${new Date(deploy.createdAt).toLocaleString()}`);
    
    // Fetch the actual build logs for this specific deployment
    try {
      const logs = await $`npx vercel inspect ${deploy.url} --logs`.text();
      
      // Filter for common error keywords to keep the output concise
      const errorLines = logs.split('\n').filter(line => 
        line.toLowerCase().includes('error') || 
        line.toLowerCase().includes('failed') ||
        line.toLowerCase().includes('typeerror')
      );

      if (errorLines.length > 0) {
        console.log("Primary Error Triggers:");
        errorLines.slice(-10).forEach(line => console.log(`  ❌ ${line.trim()}`));
      } else {
        console.log("No specific error lines found. Check full log at:");
        console.log(`  🔗 ${deploy.inspectorUrl}`);
      }
    } catch (e) {
      console.log(`  ⚠️ Could not fetch logs: ${e.message}`);
    }
    console.log("\n" + "=".repeat(50) + "\n");
  }
}

inspectFailures();
