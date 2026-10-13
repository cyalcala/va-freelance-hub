# Five-minute snapshot source checkpoint

This is a verified local source slice, not a Pages deployment or visibility SLO
acceptance. Start SHA `09fff133c5b70bd9a50719cc2c1e8d51f54f4c70`, branch
`codex/verified-flow-directory-checkpoint`. October 12 live observations showed
new public rows missing from sampled older boards. The existing snapshot path
used a one-hour rebuild threshold and could extend the lifetime of older data
when promoting an edge/D1 copy.

The repair reuses the existing isolate, edge, D1 snapshot and shared lease. One
five-minute constant now bounds refresh and fresh serving. Promotion expires at
the original generation deadline. At the exact deadline the durable claim is
eligible and health is stale. Snapshot-backed HTML receives at most 60 seconds
of cache life, capped by its data's remaining lifetime, including on cache HIT.
Invalid/future/expired, private, cookie-bearing, error and fallback responses
remain uncacheable. Ordinary static policy-page behavior remains unchanged.
The cache revision prevents older HTML cache policy from masking the repair.

Targeted regression on pinned Bun 1.3.14 passed **54 tests, zero failures, 223
assertions across three files, 15.22 seconds**. Cases include two concurrent
isolates using the existing single durable refresh lease, promotion of a newer
snapshot, exact native SQLite claim at five minutes, stale/error cache failure,
and actual middleware HIT forwarding one remaining second. Independent review
first found the HIT and equality gaps, reproduced both, and accepted their fixes.
The earlier 52-test result is superseded for final source acceptance; it did not
cover those two findings. A final unchanged-source run retained to durable logs
also passed 54/0/223 in 17.81 seconds; the earlier 15.22-second result came from
independent tool output and is not mislabeled as that retained log.

The app typecheck exited zero. The broader Astro server/client build exited zero
in 186.38 seconds; existing deprecation/Browserslist/externalization warnings were
retained. These checks exercised this snapshot slice alongside the separately
identified dirty lock, Workable and transport candidates in the main checkout;
they do not certify or deploy those other candidates. The final snapshot files
were also copied to the isolated live-base 3065/0054 checkout, whose complete
combined verification remains separate.

Source/test hashes and retained logs accompany this checkpoint. The measured
2,398 snapshot-query reads/build imply an estimated 690,624 reads/day at a
five-minute interval, before lease/other reads. That is an estimate, not a load
test or production CPU receipt. Five minutes is a healthy-data/cache deadline;
network failures, background scheduling, cold requests and resource exhaustion
still require actual deployment observation. No new cache layer, schedule,
provider request, source admission, schema migration or public eligibility
predicate was introduced. MATH remains **0/13**, certified daily flow **UNKNOWN**.

NEXT is the combined, live-schema-compatible release: fair permitted Workable
rotation, strict original-date exposure guards, actual-ID receipts and deferred
source retry. Then observe normal clocks and public visibility before claiming
runtime acceptance. Full durable all-opening intake remains a separate gap.
