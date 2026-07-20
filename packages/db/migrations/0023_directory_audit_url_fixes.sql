-- 0023: Directory audit — verified moved-domain URL fixes + platform recategorization (2026-07-20)
-- Applies ONLY the safe, reversible, non-removal findings from the 2026-07 audit
-- (docs/audits/directory-2026-07/FINDINGS.md). Every corrected URL was re-checked
-- live before inclusion. Removals are NOT here — they await the verified re-run.
-- Idempotent: each UPDATE sets a fixed value by id; re-running is a no-op.

-- Moved-domain URL fixes (dead link -> current live site). Resets link strike
-- state so the directory pulse re-checks the new URL fresh.
UPDATE va_directory SET website='https://kaya.services/', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=296;
UPDATE va_directory SET website='https://www.oliviapros.ph/work-from-home-careers', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=312;
UPDATE va_directory SET website='https://reassist.net.au/', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=336;
UPDATE va_directory SET website='https://somewhere.com', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=359;
UPDATE va_directory SET website='https://surgefreelancingmarketplace.com/', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=360;
UPDATE va_directory SET website='https://sellerprism.agency/', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=395;
UPDATE va_directory SET website='https://surgefreelancingmarketplace.com/', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=398;
UPDATE va_directory SET website='https://www.telusdigital.com', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=409;
UPDATE va_directory SET website='https://unity-connect.com', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=413;
UPDATE va_directory SET website='https://thinkremote.com', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=426;
UPDATE va_directory SET website='https://remotetalent.com.au', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=434;
UPDATE va_directory SET website='https://careers.coolblueva.com/', link_status=NULL, link_fail_count=0, link_checked_at=NULL WHERE id=474;

-- Platform recategorization: marketplaces & job boards are not employers.
-- 40 companies flagged is_marketplace=1: Upwork, Filipino Virtual Assistants (FVA), The Freelance Movement, VA Bootcamp PH, EVirtualAssistants, OnlineJobs, Outsource Accelerator, VirtualStaff, eVirtualAssistants, iWork.ph, OnlineJobs.ph, Remote Jobs Philippines (Instagram), Remotive, The Work at Home Woman, We Work Remotely, Working Nomads, Fiverr, Galasya, JobQuest.ph, Pesojobs, Pinoy Jobs Online, RemoteTalent.ph, RemoteWork.ph, AngelLi
UPDATE va_directory SET is_marketplace=1 WHERE id IN (234,236,239,240,275,315,317,383,390,391,421,422,424,425,427,428,438,441,444,445,446,448,449,451,452,453,454,455,456,457,458,459,460,461,462,463,464,465,467,476);
