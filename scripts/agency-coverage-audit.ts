import { db } from "../packages/db";
import { agencies } from "../packages/db/schema";

const providedList = [
  "Outsource Angel", "Pearl Talent", "Virtual Elves", "24/7 Virtual Assistant",
  "EVirtualAssistants", "GoVirtuals", "Magic Virtual Assistant Services",
  "MS Virtual Assistant", "OVA Virtual Assistant", "Pepper Virtual Assistants",
  "PMVA", "Quantum Virtual Assistants", "Virtual Champions", "Virtual Done Well",
  "Virtual Staff 365", "Virtual Staff Finder", "VirtualHub PH", "VirtualStaff",
  "VirtualStaff.ph", "Coconut VA", "LinkedVA", "PropVA", "SOS VA Services",
  "The Property VA", "The VA Hub PH", "VA Staffer", "Vaxtra", "Boldly",
  "24x7 Direct", "Access Offshoring", "AgentSync", "ArmA Sourcing",
  "Athena Executive Assistants", "Beepo", "Booth & Partners", "Bottleneck Distant Assistants",
  "Capital EA", "Clear Admin People", "Cool Pixels", "CreaThink Solutions",
  "CrewBloom", "Digital SPS", "DigiWorks", "Easy Outsourcing", "Elastic Path",
  "Fast Track FBA", "Flat Planet", "Galilee Business Support Services", "GetFriday",
  "Global Hola", "Global Teams", "GoHireNow", "Hello Rache", "HighCall",
  "Hilton Hotels Australia", "HireTalent.ph", "iWork.ph", "KDCI Outsourcing",
  "KPMG Canada", "Manpower Genius", "MultiplyMii", "My Cloud Assistant",
  "My Freight Staff", "My Virtudesk", "MyOutDesk", "Officium", "Olivia Pros",
  "OnlineHelpers", "OnlineJobs", "Outshore", "Outsource Accelerator", "Outsource Access",
  "Outsource Workers", "Outsourcey", "Outsourcing Angel", "Philippines Recruitment UK",
  "Pineapple Staffing", "Platinum Outsourcing", "ProSource", "Ramsay Health Care",
  "REassist", "Remote Raven", "Remote Staff", "Remote Workmate", "Scotiabank Canada",
  "Smart Outsourcing Solution", "Staff Avenue", "StaffingSolutions.io", "Stellar Staff",
  "SuperStaff", "Support Shepherd", "TaskBullet", "USource", "Virtalent UK",
  "WorkMate Pro", "WorkspaceCo Outsourcing"
];

async function checkCoverage() {
  const dbAgencies = await db.select({ name: agencies.name }).from(agencies);
  const dbNames = dbAgencies.map(a => a.name.toLowerCase());
  
  const missing = providedList.filter(p => !dbNames.includes(p.toLowerCase()));
  
  console.log(`TOTAL_PROVIDED: ${providedList.length}`);
  console.log(`TOTAL_IN_DB: ${dbAgencies.length}`);
  console.log(`MISSING_FROM_DB: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log("--- MISSING AGENCIES ---");
    console.log(missing.join(", "));
  } else {
    console.log("✅ ALL PROVIDED AGENCIES ARE IN THE DATABASE AND BEING MONITORED!");
  }
}

checkCoverage();
