-- 1. Update existing companies to the 'australian-dayshift' niche
UPDATE va_directory 
SET niche = 'australian-dayshift', website = 'https://www.cloudstaff.com' 
WHERE company_name = 'Cloudstaff';

UPDATE va_directory 
SET niche = 'australian-dayshift', website = 'https://flatplanet.com.au/' 
WHERE company_name = 'Flat Planet';

UPDATE va_directory 
SET niche = 'australian-dayshift', website = 'https://www.virtualstaff365.com.au/va-jobs-australia/', ats_platform = 'workable', ats_token = 'virtualstaff365'
WHERE company_name = 'Virtual Staff 365';

-- 2. Insert new companies
INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, ats_platform, ats_token) 
VALUES ('RocketAMS', 'https://apply.workable.com/rocketams/', 1, 'australian-dayshift', 1, 1, 'workable', 'rocketams');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, ats_platform, ats_token) 
VALUES ('Vault Outsourcing', 'https://vaultoutsourcing.com/', 1, 'australian-dayshift', 1, 1, 'lever', 'vaultoutsourcing');

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote) 
VALUES ('OneWorld Business Solutions', 'https://oneworldbusiness.com.au', 1, 'australian-dayshift', 1, 1);

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote) 
VALUES ('Stantaro', 'https://stantaro.com.au', 1, 'australian-dayshift', 1, 1);

INSERT INTO va_directory (company_name, website, hires_filipinos, niche, is_verified, is_remote, ats_platform, ats_token) 
VALUES ('Hunt St', 'https://apply.workable.com/hunt-st/', 1, 'australian-dayshift', 1, 1, 'workable', 'hunt-st');
