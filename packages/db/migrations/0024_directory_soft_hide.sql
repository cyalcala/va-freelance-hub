-- 0024: Directory audit — soft-hide out-of-scope companies (2026-07-20)
-- Sets hires_filipinos=0 (the directory now filters on this) for companies the
-- verified 2026-07 audit found are defunct, duplicates, or do not hire Filipino
-- talent. REVERSIBLE: no rows deleted; flip the flag to restore. Full evidence
-- per id in docs/audits/directory-2026-07/findings-2026-07-20.json.
-- Only HIGH-confidence non-PH verdicts are actioned; medium-confidence stay visible.

UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 defunct] fjaccountants.com does not resolve (DEAD_DNS); web search found no matching UK/PH accounting firm at any current domain' WHERE id=235 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 duplicate] URL resolves to 20four7va.com — same site as entry 249 (20Four7VA)' WHERE id=250 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 duplicate] LIVE; identical URL (aumtrend.com) to entry 252' WHERE id=253 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Site states its VAs/contractors are all US-based; hires only US residents, does not hire Philippines/international talent' WHERE id=259 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Hires senior W-2 employees only in US, UK, Canada and parts of Europe; Philippines not a hiring location' WHERE id=261 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Vancouver-based enterprise headless/composable commerce SaaS (founded 2000, clients Tesla/T-Mobile); a software vendor, not a VA/BPO employer' WHERE id=277 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Owned by TTK Services (TTK Group); ~200+ staff based solely in Bangalore, India, since 2005 — no Philippines operations' WHERE id=281 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 defunct] DEAD_DNS — domain does not resolve; no trace of any ''Hammerhead'' VA agency in VA directories or search (only unrelated VR/marketing ''Hammerhead'' firms)' WHERE id=288 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Global hotel chain''s Australian booking site; not a VA/BPO or remote-Filipino employer' WHERE id=291 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Big-Four professional services firm''s Canadian entity; not a Filipino VA/BPO employer' WHERE id=295 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Root DNS failed but www.msvirtualassistant.com.au is live; company states all VAs live and work in Australia — no Philippines hiring' WHERE id=300 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 duplicate] getmagic.pinpointhq.com (Pinpoint ATS careers subdomain) 404s; this is a duplicate of GetMagic (#301) whose main site is live' WHERE id=302 AND hires_filipinos=1;
-- #309 kept (primary OVA Virtual row); only its duplicate #310 is hidden.
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 duplicate] Same domain as id 309 (ovavirtual.com); LIVE — hidden as dup of #309' WHERE id=310 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 defunct] DEAD_DNS; domain does not resolve and web search found no successor domain or active presence' WHERE id=328 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 duplicate] Same company and same URL as entry 355' WHERE id=356 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] UAssist.ME is a bilingual VA firm based in El Salvador; assistants are Latin America-based, not Filipino' WHERE id=365 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Virtalent markets exclusively UK-based virtual assistants as its core differentiator' WHERE id=373 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 defunct] Domain does not resolve; web searches surface no successor domain or relaunch announcement for this generic-named agency (a similarly named job board virtualassistantphilippines.ph' WHERE id=375 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 duplicate] Same platform as entry 383 (URL is just the /en-ph locale path of virtualstaff.ph); it is a marketplace, not an employer.' WHERE id=384 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 duplicate] Same company and same URL as entry #393.' WHERE id=394 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 duplicate] Same company and same URL as entry #396.' WHERE id=397 AND hires_filipinos=1;
-- #405 Majorel KEPT visible: acquired by Teleperformance but still a real BPO
-- that hires Filipinos; not a clear defunct/non-PH/dup case. Left for human review.
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] JobRack is a recruitment marketplace focused on Eastern European (and South African) remote talent, not Filipinos' WHERE id=420 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 defunct] koos.com.au DNS dead; two web searches found no trace of the company under this or a new domain (only unrelated ''Knights of Online Marketers'' in Davao)' WHERE id=432 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 defunct] Domain parked/for-sale; search finds only small US real-estate wholesaler LLCs (Phoenix AZ / Facebook page) with no active site and no PH-hiring footprint' WHERE id=469 AND hires_filipinos=1;
UPDATE va_directory SET hires_filipinos=0, notes=coalesce(notes||' | ','')||'[audit 2026-07-20 not-ph-hiring] Careers/FAQ pages state applicants must be permanent residents of the US, UK, or Ireland; no Philippines hiring.' WHERE id=529 AND hires_filipinos=1;
