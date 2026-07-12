-- RemoteWork3.8_Updated import, 2026-07-12.
-- 14 new companies from RemoteWork3.8 cross-referenced against va_directory.
-- Idempotent: each INSERT is guarded by NOT EXISTS on lower(company_name),
-- so re-running (or overlap with prior imports) creates no duplicates even
-- though company_name has no UNIQUE index. Remote Philippines Jobs skipped
-- (spreadsheet Status='Caution'). 7 rows carry verified ATS tokens
-- (5 Ashby + 2 Greenhouse), all probed live 2026-07-12.

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
SELECT 'Grafana Labs', 'https://grafana.com', 1, 'tech', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire, remote-first', 'greenhouse', 'grafanalabs'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Grafana Labs'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
SELECT 'Ashby', 'https://www.ashbyhq.com', 1, 'tech', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire, remote-first ATS vendor', 'ashby', 'ashby'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Ashby'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
SELECT 'Supabase', 'https://supabase.com', 1, 'tech', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire, remote-first', 'ashby', 'supabase'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Supabase'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
SELECT 'Nearform', 'https://nearform.com', 1, 'tech', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire, remote-first', 'greenhouse', 'nearform'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Nearform'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
SELECT 'Camunda', 'https://camunda.com', 1, 'tech', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire, remote-first', 'ashby', 'camunda'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Camunda'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
SELECT 'Tremendous', 'https://www.tremendous.com', 1, 'tech', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire, remote-first', 'ashby', 'tremendous'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Tremendous'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
SELECT 'Amplify', 'https://www.amplify.com', 1, 'tech', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire (EdTech), remote roles', 'ashby', 'amplify'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Amplify'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
SELECT 'Adobe', 'https://www.adobe.com', 1, 'tech', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire; enterprise ATS, no public feed'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Adobe'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
SELECT 'Alorica', 'https://www.alorica.com', 1, 'bpo', 1, 1, 'RemoteWork3.8 import 2026-07-12: BPO/Remote'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Alorica'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
SELECT 'BCD Travel', 'https://www.bcdtravel.com', 1, 'bpo', 1, 1, 'RemoteWork3.8 import 2026-07-12: Direct Hire (travel); enterprise ATS'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('BCD Travel'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
SELECT 'Virtual Coworker', 'https://virtualcoworker.com.ph', 1, 'global-va', 1, 1, 'RemoteWork3.8 import 2026-07-12: PH VA agency'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Virtual Coworker'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
SELECT 'Conduent', 'https://www.conduent.com', 1, 'bpo', 1, 1, 'RemoteWork3.8 import 2026-07-12: BPO/Remote'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('Conduent'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
SELECT 'TTEC', 'https://www.ttec.com', 1, 'bpo', 1, 1, 'RemoteWork3.8 import 2026-07-12: BPO/Remote'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('TTEC'));

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
SELECT 'VXI', 'https://www.vxi.com', 1, 'bpo', 1, 1, 'RemoteWork3.8 import 2026-07-12: BPO/Remote'
WHERE NOT EXISTS (SELECT 1 FROM va_directory WHERE lower(company_name) = lower('VXI'));
