# Dayshift priority careers evidence — 2026-10-13

Affordable Staff has a supported PH dayshift hiring path, but its current office-only policy contradicts an employee-WFH interpretation of the retained remote flag. Hammerjack has an official careers portal and mixed work arrangements. EzyVA's retained domain does not establish a current hiring path. These findings support immediate attention to the existing company records; they do not certify vacancies, source admission or publication throughput.

Observed on **2026-10-13**, in a bounded primary-site review beginning **10:39 UTC / 18:39 Manila**. Scope: company careers/home/about/FAQ/privacy pages and existing identity evidence. No vacancy API, individual vacancy collection, applications, login, enrollment, deployment or database mutation occurred. Web-reader crawl dates can precede this observation; the EzyVA discrepancy below preserves that limit explicitly.

## Existing records and current evidence

| Company | Retained identity, not a new enrollment | Supported hiring path | PH / dayshift / remote finding |
| --- | --- | --- | --- |
| Affordable Staff | Directory **242**; repository candidate **exp:affordablestaff** | [Pathcutters job opportunities](https://pathcutters.ph/job-opportunities/) | Employer-branded Pathcutters Affordable Staff describes a PH VA workforce serving AU/NZ clients and fixed day shifts. Affordable Staff's own FAQ specifies its Bacolod office and rejects WFH. |
| EzyVA | Directory **244**; repository candidate **exp:ezyva** | **Unverified**; retained domain [ezyva.com](https://ezyva.com/) | No current official careers, PH eligibility, dayshift or employee-remote statement could be established in this review. Domain evidence is inconsistent across readers. |
| Hammerjack | Directory **431**; retained website hammerjack.com.au | [Official careers handoff](https://hammerjack.com.au/careers) → [careers.hammerjack.com.au](https://careers.hammerjack.com.au/) | Official employer pages advertise day shifts and WFH, hybrid and office arrangements, with PH office locations. Arrangement and eligibility still vary by vacancy. |

Identity baseline: the bounded D1 directory read at **2026-10-12T12:11:30.235Z**, recorded in the incident workspace's `tmp/directory-au-dayshift-cohort-oct12.json`, had all three in `australian-dayshift`, with `is_dayshift=1`, `is_verified=1`, `is_remote=1` and `hires_filipinos=1`. Each had null `hiring_page_url`, `verified_at`, ATS fields and joined registry identity/policy fields. This is a dated directory join, **not a fresh full Turso/D1 inventory or proof that no admission exists elsewhere**. The two experimental identities are already preserved in [candidate-cohort.json](../../scripts/experiments/candidate-cohort.json). Old flags without dated supporting evidence do not constitute renewed vetting.

## Affordable Staff: PH dayshift, office-only

The [Affordable Staff FAQ](https://affordablestaff.com.au/faqs/) says its team works from its Bacolod, Philippines office and that it does not operate a work-from-home model. It also describes alignment with Australian business hours. This is a concrete counterexample to treating a VA outsourcing company's overseas-client relationship as employee remote work.

The [Pathcutters about page](https://pathcutters.ph/about-us/) identifies the company as **Pathcutters Affordable Staff**, describes PH-based administrative/virtual assistants supporting AU/NZ clients, and states fixed day shifts. Its [homepage](https://pathcutters.ph/) presents office-based careers; its supported [job-opportunities landing page](https://pathcutters.ph/job-opportunities/) provides a human hiring path. The explicit brand relationship and shared Bacolod office are alias evidence to reconcile against record 242 before creating any second source identity. This review did not establish corporate ownership independently or inspect individual vacancies/application forms.

Disposition: retain its directory/day-shift value and attach these primary evidence pointers to the existing record through the authorized reconciliation path. Review the meaning of `is_remote` against the explicit office-only policy. Office-based work does not pass the vacancy remote gate through a company-level exception.

## EzyVA: current career identity unresolved

The web reader could not open the retained apex site. Opening [www.ezyva.com](https://www.ezyva.com/) resolved to a [GoDaddy domain-sale page](https://forsale.godaddy.com/forsale/ezyva.com); that returned page was labelled crawled last month. Independent ordinary GETs at **10:48:57 UTC** returned HTTP 200 and `text/html` for both apex and www, but only **114 characters**, with no HTML title, HTTP redirect or employer/careers evidence. HTTP 200 therefore does not validate the old `link_status=ok` or prove current business activity.

The two readers do not justify a confident claim that the domain is currently parked, that EzyVA closed, or that a similarly named business is its successor. No official replacement careers identity was verified. Disposition: preserve record 244 / exp:ezyva and mark this research outcome **needs_review** for current employer-domain ownership, supported hiring URL and dated PH/dayshift/remote evidence. Use the existing bounded review process and a concrete next trigger; do not enroll a guessed alias or collect from the sale page.

## Hammerjack: official portal, mixed arrangements

The [employer careers page](https://hammerjack.com.au/careers) links directly to [careers.hammerjack.com.au](https://careers.hammerjack.com.au/), and both advertise day shifts plus WFH, hybrid and office arrangements. The portal identifies Teamtailor as its career-site provider. This establishes a supported human careers handoff and an observed provider, **not a public API contract, tenant admission or permission to aggregate**. Its mixed arrangements are a counterexample to applying the directory's remote flag to every listing.

Disposition: reconcile the existing Hammerjack record, career domain and any existing Turso/registry identity before proposing a provider identity. Prioritize the existing source-specific permission/access-path and vacancy-evidence checks. The [employer privacy page](https://hammerjack.com.au/privacy-policy) is not an automated collection or redistribution grant; applicant/employee logins and application data were not accessed.

## Acceptance boundary and immediate next slice

These are company/careers observations, not counts of fresh eligible jobs. Publication dates, fresh PH-eligible remote vacancies, URL/dedup/safety outcomes, source leases, permitted cadence, canary receipts and first-publication receipts were not verified. Every vacancy retains the independent geo, remote, freshness, source, URL, safety, deduplication and publication gates. No directory flag or owner priority overrides those gates; MATH acceptance and 100–150/day flow remain unproven by this report.

The smallest useful next slice is to reconcile these evidence pointers with the **three existing records**: Affordable Staff's Pathcutters alias and office-only restriction; Hammerjack's official career handoff and current admission gaps; EzyVA's unresolved domain identity. Existing cleared PH/VA submissions retain immediate permitted evidence attention without waiting for unrelated bulk intake completeness.
