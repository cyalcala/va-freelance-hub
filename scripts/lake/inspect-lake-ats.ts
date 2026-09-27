import { getLakeClient } from "./client";

async function main() {
  const client = getLakeClient();
  const res = await client.execute(`
    SELECT focus_group, priority, count(*) as count,
           sum(case when status = 'processed' then 1 else 0 end) as processed,
           sum(case when prospecting_status = 'ats_discovered' then 1 else 0 end) as ats_discovered,
           sum(case when prospecting_status = 'job_board_cataloged' then 1 else 0 end) as board_cataloged
    FROM lake_intake_items
    GROUP BY focus_group, priority
    ORDER BY priority ASC, count DESC;
  `);

  console.log(`Intake items in Turso Lake:`);
  console.table(res.rows);

  const au = await client.execute(`
    SELECT company_name, website, domain, prospecting_status, discovered_sources_json
    FROM lake_intake_items
    WHERE focus_group = 'australian_dayshift'
    ORDER BY id ASC;
  `);

  console.log(`\nAustralian Dayshift intake items (22 items):`);
  console.table(au.rows);
}

main().catch(console.error);
