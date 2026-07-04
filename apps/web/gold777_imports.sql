-- gold777.xlsx directory import, 2026-07-04
-- 32 new companies cross-referenced against production va_directory (265 existing rows).
-- 3 near-duplicates skipped (Pepper Virtual Assistant, Belay, GetMagic already present under slightly different names).
-- 44 exact/normalized duplicates skipped entirely (see docs/gold777-directory-import-2026-07-04.md).

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('VA Workers PH', 'https://vaworkersph.com', 1, 'job-boards', 0, 1, 'Gold777 import 2026-07-04: Platform/Job Board');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Kerja-Remote', 'https://kerja-remote.com', 1, 'job-boards', 0, 1, 'Gold777 import 2026-07-04: Platform/Job Board (APAC remote board)');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('HireBasis', 'https://www.hirebasis.com', 1, 'job-boards', 0, 1, 'Gold777 import 2026-07-04: Platform/Job Board');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Prosple', 'https://ph.prosple.com', 1, 'job-boards', 0, 1, 'Gold777 import 2026-07-04: Platform/Job Board (PH fresh-grad listings)');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('GigaBPO', 'https://gigabpo.com', 1, 'bpo', 0, 1, 'Gold777 import 2026-07-04: Platform/Job Board; direct-hire PH BPO/VA staffing');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('ClickUp', 'https://clickup.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Software, Rating: High, Source: Reddit', 'https://clickup.com/careers');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Himalayas', 'https://himalayas.app', 1, 'job-boards', 1, 1, 'Gold777 import 2026-07-04: Job Board/Remote First, Rating: High, Source: Search');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url, ats_platform, ats_token)
VALUES ('Remote.com', 'https://remote.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: EOR/Payroll, Rating: High, Source: Search', 'https://remote.com/careers', 'greenhouse', 'remotecom');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Remote Philippines', 'https://remotephilippines.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Outsourcing, Rating: Verified, Source: Search');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Amentum', 'https://www.amentumcareers.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Contracting, Rating: Verified, Source: Facebook');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Canva', 'https://www.canva.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Design, Rating: Excellent, Source: Verified', 'https://www.canva.com/careers/');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Wise', 'https://wise.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Fintech, Rating: Excellent, Source: Verified', 'https://wise.jobs');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Shopify', 'https://www.shopify.com', 1, 'ecommerce', 1, 1, 'Gold777 import 2026-07-04: E-commerce, Rating: Excellent, Source: Verified', 'https://www.shopify.com/careers');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Zapier', 'https://zapier.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Automation, Rating: Excellent, Source: Verified', 'https://zapier.com/jobs');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Buffer', 'https://buffer.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Social Media, Rating: Excellent, Source: Verified', 'https://buffer.com/journey');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url, ats_platform, ats_token)
VALUES ('GitLab', 'https://about.gitlab.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Software, Rating: Excellent, Source: Verified', 'https://about.gitlab.com/jobs/', 'greenhouse', 'gitlab');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Automattic', 'https://automattic.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Software, Rating: Excellent, Source: Verified', 'https://automattic.com/work-with-us/');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Help Scout', 'https://www.helpscout.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Customer Support, Rating: Excellent, Source: Verified', 'https://www.helpscout.com/careers/');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Doist', 'https://doist.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Productivity, Rating: Excellent, Source: Verified', 'https://doist.com/careers');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
VALUES ('Ghost', 'https://ghost.org', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Publishing, Rating: Excellent, Source: Verified', 'greenhouse', 'ghost');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Basecamp / 37signals', 'https://37signals.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Productivity, Rating: Excellent, Source: Verified', 'https://37signals.com/jobs');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Visa', 'https://www.visa.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Financial Services, Rating: High, Source: Reddit');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Synchrony', 'https://www.synchrony.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Financial Services, Rating: High, Source: Reddit');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Wells Fargo', 'https://www.wellsfargo.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Financial Services, Rating: High, Source: Reddit');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Ernst & Young', 'https://www.ey.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Professional Services, Rating: High, Source: Reddit');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Macquarie Group', 'https://www.macquarie.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Financial Services, Rating: High, Source: Reddit');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, hiring_page_url)
VALUES ('Atlassian', 'https://www.atlassian.com', 1, 'tech', 1, 1, 'Gold777 import 2026-07-04: Software, Rating: Excellent, Source: Reddit', 'https://www.atlassian.com/company/careers');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Nokia Manila / Networklabs', 'https://www.nokia.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Telecommunications, Rating: High, Source: Reddit');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Century Pacific', 'https://centurypacific.com.ph', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Food/FMCG, Rating: High, Source: Reddit');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('WTW (Willis Towers Watson)', 'https://www.wtwco.com', 1, 'bpo', 1, 1, 'Gold777 import 2026-07-04: Professional Services, Rating: High, Source: Reddit');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes, ats_platform, ats_token)
VALUES ('Time Etc', 'https://www.timeetc.com', 1, 'global-va', 1, 1, 'Gold777 import 2026-07-04: VA Agency, Rating: High, Source: Review', 'breezy', 'time-etc');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, notes)
VALUES ('Wishup', 'https://wishup.co', 1, 'global-va', 1, 1, 'Gold777 import 2026-07-04: VA Agency, Rating: High, Source: Review');
