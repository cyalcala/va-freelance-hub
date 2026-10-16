import { classifyShift } from "../packages/scraper/shiftClassifier";
import { slicePublicJobs, type PublicJob } from "../apps/web/src/lib/public-board";

let failureCount = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failureCount++;
  } else {
    // console.log(`PASS: ${message}`);
  }
}

console.log("=== RUNNING ADVERSARIAL STRESS TEST FOR DAYSHIFT & PUBLIC SLICING ===");

// -------------------------------------------------------------
// PART 1: Schedule Fabrication Boundaries
// -------------------------------------------------------------
console.log("\n--- Testing Schedule Fabrication Boundaries (Timezones alone & Non-schedule cues) ---");

const timezonesAlone = [
  "US Eastern", "AEST", "PST", "EST", "UTC+8", "GMT+1", "AWST", "NZST", "AEDT", "ACST", "UTC-5", "CST", "MST"
];

for (const tz of timezonesAlone) {
  const res = classifyShift({ clientTimezone: tz });
  assert(res.category === "unknown", `clientTimezone alone '${tz}' must return unknown (got ${res.category})`);
  assert(res.isDayshift === false, `clientTimezone alone '${tz}' must have isDayshift=false`);
  assert(res.phWorkingHours === null, `clientTimezone alone '${tz}' must have phWorkingHours=null`);
  assert(res.clientTimezone === tz, `clientTimezone alone '${tz}' preserves clientTimezone value`);

  // Timezone alone with generic company description
  const res2 = classifyShift({ clientTimezone: tz, description: "We are an agency headquartered in this timezone." });
  assert(res2.category === "unknown", `clientTimezone '${tz}' with generic description must return unknown`);
  assert(res2.isDayshift === false, `clientTimezone '${tz}' with generic description must have isDayshift=false`);
  assert(res2.phWorkingHours === null, `clientTimezone '${tz}' with generic description must have phWorkingHours=null`);
}

const deadlinesAndLocations = [
  "Apply before 5 PM PST for immediate consideration",
  "Applications close 11:59 PM AEST on October 31st",
  "Please submit your CV by 5:00 PM EST",
  "Headquartered in Sydney (AEST time)",
  "Our main office is located in Brisbane, Queensland",
  "Interviews will be held between 2 PM and 4 PM EST",
  "Candidates must be available for an interview at 10 AM PST"
];

for (const text of deadlinesAndLocations) {
  const res = classifyShift({ description: text });
  assert(res.category === "unknown", `Deadline/location text "${text}" must return unknown (got ${res.category})`);
  assert(res.isDayshift === false, `Deadline/location text "${text}" must have isDayshift=false`);
  assert(res.phWorkingHours === null, `Deadline/location text "${text}" must have phWorkingHours=null`);
}

const medicalAndTechTitles = [
  "CT Imaging Documentation Specialist",
  "PST Team Coordinator & QA",
  "CST Operating Room Sterile Tech",
  "EST Senior Cloud Infrastructure Architect",
  "PACU Clinical Support Assistant"
];

for (const title of medicalAndTechTitles) {
  const res = classifyShift({ title, description: "Responsible for core operations and logging." });
  assert(res.category === "unknown", `Title abbreviation "${title}" must return unknown (got ${res.category})`);
  assert(res.isDayshift === false, `Title abbreviation "${title}" must have isDayshift=false`);
  assert(res.phWorkingHours === null, `Title abbreviation "${title}" must have phWorkingHours=null`);
}

// -------------------------------------------------------------
// PART 2: Conflicting Markers & Negation
// -------------------------------------------------------------
console.log("\n--- Testing Conflicting Markers & Negation ---");

const conflictingInputs = [
  "Day shift / night shift required",
  "Day shift or night shift depending on project assignment",
  "Day shift and night shift positions available",
  "Must be available for day shift, mid shift, or night shift",
  "Australian business hours or US business hours",
  "UK business hours / APAC business hours",
  "Morning shift or graveyard shift",
  "Day shift position with mandatory graveyard shift rotation",
  "Work daytime hours or US Eastern business hours",
  "Philippine business hours or night shift",
  "8am - 5pm Manila time or night shift depending on client",
  "8am - 5pm Manila time / night shift required"
];

for (const desc of conflictingInputs) {
  const res = classifyShift({ description: desc });
  assert(res.category === "unknown", `Conflicting schedule "${desc}" must return unknown (got ${res.category})`);
  assert(res.isDayshift === false, `Conflicting schedule "${desc}" must have isDayshift=false`);
  assert(res.phWorkingHours === null, `Conflicting schedule "${desc}" must have phWorkingHours=null`);
  assert(res.evidence.includes("unstated, negated, or conflicting"), `Conflicting evidence message must be returned`);
}

const negatedInputs = [
  "No night shift required",
  "Not a graveyard shift role",
  "Without night shift obligations",
  "No 8am - 5pm Manila time shift required",
  "Not required to work Australian business hours",
  "Without day shift requirements",
  "No day shift required for this async role"
];

for (const desc of negatedInputs) {
  const res = classifyShift({ description: desc });
  assert(res.category === "unknown", `Negated schedule "${desc}" must return unknown (got ${res.category})`);
  assert(res.isDayshift === false, `Negated schedule "${desc}" must have isDayshift=false`);
  assert(res.phWorkingHours === null, `Negated schedule "${desc}" must have phWorkingHours=null`);
}

// -------------------------------------------------------------
// PART 3: Explicit Daytime Spans & Genuine Day Shift Markers
// -------------------------------------------------------------
console.log("\n--- Testing Explicit Daytime Spans & Expanded Dayshift Markers ---");

const explicitSpans = [
  { text: "Working hours: 8am - 5pm Manila time", span: "8am - 5pm Manila time" },
  { text: "Shift: 9:00 am - 6:00 pm (PHT)", span: "9:00 am - 6:00 pm (PHT)" },
  { text: "Schedule is 7:00 AM - 4:00 PM PHT", span: "7:00 AM - 4:00 PM PHT" },
  { text: "Expected hours: 6am to 3pm Philippine time", span: "6am to 3pm Philippine time" },
  { text: "Core schedule: 8:00 AM - 5:00 PM (PHT) daily", span: "8:00 AM - 5:00 PM (PHT)" },
  { text: "Shift time: 08:00 am - 05:00 pm Manila time", span: "08:00 am - 05:00 pm Manila time" },
  { text: "Hours: 9am – 6pm Manila time", span: "9am – 6pm Manila time" },
  { text: "Hours: 9am — 6pm Manila time", span: "9am — 6pm Manila time" },
  { text: "Office timing: 10:00 am - 6:00 pm PHT", span: "10:00 am - 6:00 pm PHT" },
  { text: "Coverage: 7am to 4pm Manila time required", span: "7am to 4pm Manila time" }
];

for (const { text, span } of explicitSpans) {
  const res = classifyShift({ description: text });
  assert(res.category === "day_shift", `Explicit span in "${text}" must be day_shift (got ${res.category})`);
  assert(res.isDayshift === true, `Explicit span in "${text}" must have isDayshift=true`);
  assert(res.phWorkingHours === span, `Explicit span in "${text}" must extract "${span}" (got "${res.phWorkingHours}")`);
  assert(res.evidence.includes(span), `Evidence must contain exact span`);
}

const expandedDayshiftPhrases = [
  "Work Australian business hours",
  "Must be available during Australian hours",
  "New Zealand business hours required",
  "NZ business hours",
  "AU business hours",
  "APAC business hours",
  "Operating during AEST business hours",
  "AWST business hours position",
  "Philippine business hours schedule",
  "Morning shift position",
  "Daytime shift with full benefits",
  "Day-shift role for local team",
  "Day shift Virtual Assistant"
];

for (const phrase of expandedDayshiftPhrases) {
  const res = classifyShift({ description: phrase });
  assert(res.category === "day_shift", `Expanded phrase "${phrase}" must be day_shift (got ${res.category})`);
  assert(res.isDayshift === true, `Expanded phrase "${phrase}" must have isDayshift=true`);
  assert(res.phWorkingHours === null, `Expanded phrase "${phrase}" without time span must have phWorkingHours=null`);
}

// -------------------------------------------------------------
// PART 4: In-Memory Public Board Slicing with shift: 'day_shift'
// -------------------------------------------------------------
console.log("\n--- Testing In-Memory Public Board Slicing (slicePublicJobs) ---");

function makeJob(id: number, overrides: Partial<PublicJob>): PublicJob {
  return {
    id,
    title: `Job ${id}`,
    company: "Test Co",
    type: "VA",
    sourceUrl: `https://example.com/job/${id}`,
    sourcePlatform: "workable",
    sourceId: `job-${id}`,
    tags: ["va"],
    category: "admin",
    experienceLevel: "mid",
    postedAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    geoScope: "ph_only",
    phEligibility: "eligible_verified",
    geoEvidence: "Test",
    description: "Generic job description",
    clientTimezone: null,
    locationType: "remote",
    payRange: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockJobs: PublicJob[] = [
  // DAY SHIFT JOBS (Expected to match shift: 'day_shift'):
  makeJob(1, { shiftCategory: "day_shift", isDayshift: true, title: "Explicit Day Shift Tagged" }),
  makeJob(2, { shiftCategory: "day_shift", isDayshift: true, description: "Hours: 8am - 5pm Manila time" }),
  makeJob(3, { shiftCategory: null, isDayshift: true, title: "Legacy Boolean isDayshift" }),
  makeJob(4, { shiftCategory: null, isDayshift: undefined, description: "Day shift role for AU accounting" }),
  makeJob(5, { shiftCategory: null, isDayshift: undefined, description: "Working schedule is 8am - 5pm Manila time" }),
  makeJob(6, { shiftCategory: null, isDayshift: undefined, title: "Executive Assistant - Australian business hours" }),
  makeJob(7, { shiftCategory: null, isDayshift: undefined, description: "Required during APAC business hours" }),
  makeJob(8, { shiftCategory: null, isDayshift: undefined, description: "Morning shift customer service" }),

  // NON-DAY SHIFT JOBS (Must NEVER match shift: 'day_shift'):
  makeJob(9, { shiftCategory: "night_shift", isDayshift: false, title: "Night Shift Specialist" }),
  makeJob(10, { shiftCategory: "night_shift", isDayshift: false, description: "US Eastern business hours" }),
  makeJob(11, { shiftCategory: "mid_shift", isDayshift: false, title: "UK Mid Shift Specialist" }),
  makeJob(12, { shiftCategory: "mid_shift", isDayshift: false, description: "Must work European business hours" }),
  makeJob(13, { shiftCategory: "flexible", isDayshift: false, title: "Async Writer" }),
  makeJob(14, { shiftCategory: "flexible", isDayshift: false, description: "Work whenever you want; flexible schedule" }),
  makeJob(15, { shiftCategory: "unknown", isDayshift: false, clientTimezone: "US Eastern", title: "US Eastern Timezone Alone" }),
  makeJob(16, { shiftCategory: "unknown", isDayshift: false, clientTimezone: "AEST", title: "AEST Timezone Alone" }),
  makeJob(17, { shiftCategory: "unknown", isDayshift: false, description: "Submit application before 5 PM PST" }),
  makeJob(18, { shiftCategory: "unknown", isDayshift: false, description: "Day shift / night shift required" }),
  makeJob(19, { shiftCategory: "unknown", isDayshift: false, title: "CT Imaging Documentation Specialist" }),
  makeJob(20, { shiftCategory: "unknown", isDayshift: false, description: "No night shift required" }),
  makeJob(21, { shiftCategory: null, isDayshift: false, description: "Results-driven marketing manager" }),
  makeJob(22, { shiftCategory: undefined, isDayshift: undefined, description: "General virtual assistant" }),
];

// 4.1 Filter with shift: 'day_shift'
const dayShiftResult = slicePublicJobs(mockJobs, {
  shift: "day_shift",
  offset: 0,
  limit: 50,
});

const matchedIds = dayShiftResult.jobs.map(j => j.id).sort((a, b) => a - b);
const expectedDayShiftIds = [1, 2, 3, 4, 5, 6, 7, 8];

assert(dayShiftResult.total === expectedDayShiftIds.length, `Expected ${expectedDayShiftIds.length} day shift jobs, got ${dayShiftResult.total}`);
assert(JSON.stringify(matchedIds) === JSON.stringify(expectedDayShiftIds), `Matched IDs ${JSON.stringify(matchedIds)} must equal ${JSON.stringify(expectedDayShiftIds)}`);

// Verify that NONE of the non-day shift jobs leaked into the day shift slice
for (let id = 9; id <= 22; id++) {
  assert(!matchedIds.includes(id), `Non-dayshift Job ${id} must NOT leak into day_shift slice`);
}

// 4.2 Pagination with shift: 'day_shift'
const pagedResult = slicePublicJobs(mockJobs, {
  shift: "day_shift",
  offset: 2,
  limit: 3,
});
assert(pagedResult.total === 8, `Paged total must still be 8 (got ${pagedResult.total})`);
assert(pagedResult.jobs.length === 3, `Paged jobs slice length must be 3 (got ${pagedResult.jobs.length})`);

// 4.3 Filter with shift: 'night_shift'
const nightResult = slicePublicJobs(mockJobs, {
  shift: "night_shift",
  offset: 0,
  limit: 50,
});
const nightIds = nightResult.jobs.map(j => j.id).sort((a, b) => a - b);
assert(nightIds.includes(9) && nightIds.includes(10), `Night shift jobs 9 & 10 must match night_shift filter`);
assert(!nightIds.some(id => expectedDayShiftIds.includes(id)), `No day shift jobs should match night_shift filter`);

// 4.4 Filter with shift: 'flexible'
const flexResult = slicePublicJobs(mockJobs, {
  shift: "flexible",
  offset: 0,
  limit: 50,
});
const flexIds = flexResult.jobs.map(j => j.id).sort((a, b) => a - b);
assert(flexIds.includes(13) && flexIds.includes(14), `Flexible jobs 13 & 14 must match flexible filter`);
assert(!flexIds.some(id => expectedDayShiftIds.includes(id)), `No day shift jobs should match flexible filter`);

// 4.5 Filter without shift (all jobs returned)
const allResult = slicePublicJobs(mockJobs, {
  offset: 0,
  limit: 50,
});
assert(allResult.total === mockJobs.length, `Total without filter must equal ${mockJobs.length} (got ${allResult.total})`);

console.log("\n=======================================================");
if (failureCount === 0) {
  console.log("ALL ADVERSARIAL CHALLENGES PASSED (0 failures)");
} else {
  console.error(`FAILED: ${failureCount} failures encountered!`);
  process.exit(1);
}
