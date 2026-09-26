#!/usr/bin/env bun
import { auditPaperSystems } from "./constitution-metrics";
import { auditQueueInstrumentation } from "./queue-metrics";

const paper = auditPaperSystems();
const queue = auditQueueInstrumentation();
const errors = [...paper.errors, ...queue.errors];
const warnings = [...paper.warnings, ...queue.warnings];

for (const error of errors) console.error(error);
for (const warning of warnings) console.warn(`warning: ${warning}`);

if (errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log("constitution audit: cohort partition, ground-truth unknown rule, and queue instrumentation passed");
}
