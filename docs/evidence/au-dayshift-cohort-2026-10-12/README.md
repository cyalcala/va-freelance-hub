# Australian/dayshift cohort and snapshot read evidence

These are bounded read-only October 12 observations. The directory sample contains
46 rows, 44 publicly visible, with 22 stored verified flags. Only five visible
rows have careers URLs and canonical joins: two admitted Workable canaries and
three unresolved source identities. These flags do not prove current employer,
source permission or vacancy eligibility. The exact observation times and stored
facts remain in the JSON files; their local and portable LF hashes are recorded
in `integrity.json`.

The second receipt includes the exact existing snapshot-query cost observations:
1,637 opportunity reads and 761 company reads, 2,398 combined per build. A five-
minute interval implies an estimated 690,624 such reads/day at 288 builds, before
lease/other reads; this is a planning estimate, not a performed load test or CPU
acceptance. Every recorded D1 query reports zero rows written. No credentials,
provider jobs, new source admission, publication or paid advisory call is included.

See [the live diagnosis](../../operations/ZERO_FLOW_SOURCE_DIAGNOSIS_2026-10-12.md),
[owner directive](../../directives/2026-10-12-OWNER-VA-OPENING-COMPLETENESS.md) and
[behavioral audit](../../audits/PONYTAIL_BEHAVIORAL_BLOAT_2026-10-12.md). Source
priority and complete permitted intake preserve all per-vacancy and source gates.
