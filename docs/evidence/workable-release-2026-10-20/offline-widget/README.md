# Offline full-widget input proof for f34965b0

The production source and built distribution were not changed by these probes.
Source: f34965b0c7bbfb76395259ccce0b60ad4533eee0; parent34e3bd1e.
Pinned runtime: Bun1.3.14. Actual input is the retained minimal factual projection
from the permitted October20 observation, not a raw response or new fetch.
Hunt143 location records/140 source+URL openings; Crew152/64; total295/204.
Capture clock:2026-10-20T10:14:54.274Z. Input SHA256:
c2897964d774765ef4988c528a36167e9bd288724f1865cd573c9dd880a8363c.

| Native input order | Exit | Stored unique rows | Public unique rows | Check result |
|---|---:|---:|---:|---|
| Original complete arrays |0|24|3|16/16 pass|
| Original + per-insert count audit |0|24|3|16/16 pass|
| Both arrays reversed |0|24|4|16/16 pass|
| Stable non-PH records first |1|23|4|15/16 pass; explicit captured-PH support fails|

Original public jobs: Hunt64BA8C27E3 Oct12, Hunt7C685D947F Oct20,
Crew1D97875E3C Oct2. Native IDs/countries/original posting dates/hidden reasons,
FTS presence, original response hashes and source ledger entries are in receipts.
All cases retain the two-source selection, 2/source cap, schema0054, source
authority/CAS gates, exact posting dates and duplicate protection. The observed
cap is bounded to this single process and does not prove cross-writer safety.

Authority packets, transports and primary/skeptic AI responses are synthetic.
The AI fixture deliberately affirms PH eligibility for every model call. The
non-PH-first control therefore publishes CrewFA5B16F03E (AI/ML Security Engineer)
as eligible_likely from a Honduras variant; its captured alternatives are Mexico,
UnitedStates, CostaRica and Honduras, with no explicit PH record. This is a
preserved adversarial demonstration of the existing uncertain-geo model lane,
not certified PH ineligibility, real AI adjudication, real D1 exposure or evidence
that f349 introduced this behavior. geoGate/triage/triage-decision/publication-
gateway are unchanged from34e to f349. No change to that lane was made here.

Original Crew count discrepancy: first INSERT creates one physical opportunity
but Bun reports7 changed records including FTS effects; second duplicate INSERT
reports0 and creates0. Existing gateway clamps7 to proposed2, so its source ledger
reports2 while only one Crew opportunity is public. Response/ledger total4 versus
three physical public opportunities is conservative metadata amplification.
The pinned Bun implementation uses sqlite3_total_changes(after)-before; the
fixture copies that value to synthetic D1 meta.changes. The microprobe separately
observes Bun2/SQLchanges1/one item+one audit-trigger row. Actual production D1 FTS
accounting is unverified; no production7 claim follows from native metadata.

These runs start from an empty synthetic opportunity table, distinct from the
actual259-existing production baseline. They do not prove production recall,
convergence, current live authority, inactive multi-location recovery, certified
PH precision, the100–150/day goal, or closure of legacy empty publication-ID
receipts. Location variants waste intake/model budget and publication slots;
canonical evidence consolidation before AI and physical-ID receipts are separate
follow-ups. Blind first-URL dedup could discard a stronger PH variant and is not
proposed. Original/reversed green cases do not erase the adversarial red case.

An initial setup failed before native execution because full arrays exceeded the
Windows command-line size bound. The repaired runner reads the existing input
file inside the fixture; the failed setup is preserved in the original proofroot
as actual-full-widget-native-setup-first.log/.exit and described in the summary.
No credential-bearing logs or process transcripts are copied here.

Reproduction scripts are retained verbatim and were run in
tmp/workable-rotation-release-proof next to the frozen source/ directory with
the input file at ../workable-authoritative-observation-2026-10-20.json. The
scripts refuse to overwrite receipts. Commands use explicit pinned Bun:

    bun --no-env-file replay-actual-workable-full-widget.ts
    bun --no-env-file replay-actual-workable-full-widget.ts --audit
    bun --no-env-file replay-actual-workable-full-widget.ts --reverse
    bun --no-env-file replay-actual-workable-full-widget.ts --nonph-first
    bun --no-env-file probe-native-change-metadata.ts

Preserved source archive SHA256:
31bbdfeb708d7cd112b3b9d6d9c5328e35672c40058c6c1cd05731153e4e1d7d.
Preserved dist archive SHA256:
a5004a6484299e8d9ee2025734f02224bc85f3879ae798092a2b1e8b0a476165.
The summary rechecked all81 recorded dist files and clean f349 source. Archives
remain separate in the original proofroot. No rebuild, provider request, real AI
call, production write, ref push, deployment or rollback occurred in these probes.

Authoritative count references:
- https://github.com/oven-sh/bun/blob/bun-v1.3.14/src/jsc/bindings/sqlite/JSSQLStatement.cpp#L2223
- https://www.sqlite.org/c3ref/total_changes.html
- https://developers.cloudflare.com/d1/worker-api/return-object/#d1result
The D1 reference does not specify trigger/FTS inclusion for meta.changes.

Package manifest hashes every copied file. Read-only attributes are local
accidental-write protection, not WORM storage or remote backup proof.
