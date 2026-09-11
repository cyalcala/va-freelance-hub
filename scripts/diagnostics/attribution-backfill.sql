-- Deterministic exact source attribution backfill (Queue B)
-- Reconciles legacy opportunities where source_id IS NULL to their proven identity.
-- Only mutates source_id; all other fields remain completely untouched.

UPDATE opportunities SET source_id = 'we-work-remotely' WHERE source_id IS NULL AND source_platform = 'WeWorkRemotely' AND source_url LIKE 'https://weworkremotely.com/%';
UPDATE opportunities SET source_id = 'real-work-from-anywhere' WHERE source_id IS NULL AND source_platform = 'RealWorkFromAnywhere' AND source_url LIKE 'https://www.realworkfromanywhere.com/%';
UPDATE opportunities SET source_id = 'remote-ok' WHERE source_id IS NULL AND source_platform = 'RemoteOK' AND (source_url LIKE 'https://remoteok.com/%' OR source_url LIKE 'https://remoteOK.com/%');
UPDATE opportunities SET source_id = 'remotive' WHERE source_id IS NULL AND source_platform = 'Remotive' AND source_url LIKE 'https://remotive.com/%';
UPDATE opportunities SET source_id = 'breezy:20four7va' WHERE source_id IS NULL AND source_platform = '20Four7VA' AND source_url LIKE '%20four7va.breezy.hr/%';
UPDATE opportunities SET source_id = 'breezy:sourcefit' WHERE source_id IS NULL AND source_platform = 'Sourcefit' AND source_url LIKE '%sourcefit.breezy.hr/%';
UPDATE opportunities SET source_id = 'breezy:time-etc' WHERE source_id IS NULL AND source_platform = 'Time Etc' AND source_url LIKE '%time-etc.breezy.hr/%';
UPDATE opportunities SET source_id = 'ashby:supabase' WHERE source_id IS NULL AND source_platform = 'Supabase' AND source_url LIKE '%ashbyhq.com/supabase/%';
UPDATE opportunities SET source_id = 'ashby:amplify' WHERE source_id IS NULL AND source_platform = 'Amplify' AND source_url LIKE '%ashbyhq.com/amplify/%';
UPDATE opportunities SET source_id = 'ashby:camunda' WHERE source_id IS NULL AND source_platform = 'Camunda' AND source_url LIKE '%ashbyhq.com/camunda/%';
UPDATE opportunities SET source_id = 'ashby:ashby' WHERE source_id IS NULL AND source_platform = 'Ashby' AND source_url LIKE '%ashbyhq.com/ashby/%';
UPDATE opportunities SET source_id = 'ashby:tremendous' WHERE source_id IS NULL AND source_platform = 'Tremendous' AND source_url LIKE '%ashbyhq.com/tremendous/%';
UPDATE opportunities SET source_id = 'greenhouse:gitlab' WHERE source_id IS NULL AND source_platform = 'GitLab' AND source_url LIKE '%greenhouse.io/gitlab/%';
UPDATE opportunities SET source_id = 'greenhouse:grafanalabs' WHERE source_id IS NULL AND source_platform = 'Grafana Labs' AND source_url LIKE '%greenhouse.io/grafanalabs/%';
UPDATE opportunities SET source_id = 'greenhouse:remotecom' WHERE source_id IS NULL AND source_platform = 'Remote.com' AND source_url LIKE '%greenhouse.io/remotecom/%';
UPDATE opportunities SET source_id = 'greenhouse:nearform' WHERE source_id IS NULL AND source_platform = 'Nearform' AND source_url LIKE '%greenhouse.io/nearform/%';
UPDATE opportunities SET source_id = 'greenhouse:ghost' WHERE source_id IS NULL AND source_platform = 'Ghost' AND source_url LIKE '%ghst.io/%';
UPDATE opportunities SET source_id = 'workable:pearltalent' WHERE source_id IS NULL AND source_platform = 'Pearl Talent' AND source_url LIKE '%workable.com/pearltalent/%';
UPDATE opportunities SET source_id = 'workable:coconutva' WHERE source_id IS NULL AND source_platform = 'Coconut VA' AND source_url LIKE '%workable.com/coconutva/%';
UPDATE opportunities SET source_id = 'workable:crewbloom' WHERE source_id IS NULL AND source_platform = 'CrewBloom' AND source_url LIKE '%workable.com/crewbloom/%';
UPDATE opportunities SET source_id = 'workable:pineapple-staffing' WHERE source_id IS NULL AND source_platform = 'Pineapple Staffing' AND source_url LIKE '%workable.com/pineapple-staffing/%';
UPDATE opportunities SET source_id = 'workable:hello-rache' WHERE source_id IS NULL AND source_platform = 'Hello Rache' AND source_url LIKE '%workable.com/hello-rache/%';
UPDATE opportunities SET source_id = 'dribbble' WHERE source_id IS NULL AND source_platform = 'Dribbble' AND source_url LIKE 'https://dribbble.com/%';
UPDATE opportunities SET source_id = 'authentic-jobs' WHERE source_id IS NULL AND source_platform = 'AuthenticJobs' AND source_url LIKE '%authenticjobs.com/%';
UPDATE opportunities SET source_id = 'jobicy-admin-support-apac' WHERE source_id IS NULL AND source_platform = 'Jobicy' AND tags LIKE '%"admin"%';
UPDATE opportunities SET source_id = 'jobicy-supporting-apac' WHERE source_id IS NULL AND source_platform = 'Jobicy' AND (tags LIKE '%"customer-support"%' OR tags LIKE '%"customer-service"%');
UPDATE opportunities SET source_id = 'jobicy-supporting-apac' WHERE source_id IS NULL AND source_platform = 'Jobicy';
