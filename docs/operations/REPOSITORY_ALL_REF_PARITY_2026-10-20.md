> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

# Repository ref parity — 2026-10-20

The retained observations from **12:29:43.769–12:29:54.197 UTC** show exact
equality between canonical Secure Source Manager (SSM), GitHub and GitLab:
**161 branch refs, 45 tag refs and all 45 peeled tag targets**. Each host
advertised the same 251 name/SHA entries. `main` was
`216b7124c4c7fdfbb9b563f478f13002421c35b0` on all three hosts.

This is point-in-time backup evidence. The hosts were read independently;
there was no cross-host lock. Later source-economics work (`fe3599`) advanced
`main` beyond this snapshot and needs its own mirror readbacks. This record
does not assert the latest tip or unattended all-ref mirroring. SSM remains
canonical; GitHub and GitLab remain mirrors under the
[canonical repository decision](SECURE_SOURCE_MANAGER_CANONICAL_2026-10-10.md).

## Repair and failed observations

| UTC observation | Retained result |
| --- | --- |
| 11:35:11–11:36:17, initial inventory | SSM: 159 branches / 45 tags; GitHub: 144 / 44; GitLab: 6 / 0. Against the sampled canonical map, GitHub had 17 missing advertised entries and 2 different SHAs; GitLab had 243 missing entries and 1 different SHA. These entry counts include peeled tags. A differing SHA alone does not prove divergence. |
| 11:39:40, first GitHub trigger audit | 18 proposed backup refs inspected; Unicode decoding errors left 17 classified `REQUIRES_REVIEW`. This failed audit is preserved. |
| 11:42:45, corrected UTF-8 audit | All 18 inspected refs classified `NO_MATCHING_PUSH_TRIGGER_IN_INSPECTED_WORKFLOWS`. This is a bounded tracked-workflow projection, not an external webhook/app audit or a blanket claim about GitHub clocks. |
| 11:44:21–11:48:30, plan and first repair | The normal, non-force plan excluded `main`. GitHub applied 16 missing-ref creations and 2 fast-forwards; readback matched all 18. GitLab's first atomic 25-ref batch failed with exit 128, category `UNCLASSIFIED_NO_RAW_AUTH_OUTPUT`; no GitLab readback was claimed for that run. |
| 11:54:58 and 12:00:12, bounded probes | GitLab ref transport read succeeded, then one named missing-ref push succeeded. These results do not identify the earlier failure's cause. |
| 12:05:47–12:13:22, bounded repair | GitLab created the remaining 197 named refs in 20 successful batches: nineteen batches of 10 and one of 7. Readback matched 197/197 with no mismatches. GitHub had no remaining candidates in that repair. |
| 12:20:22–12:23:48, incomplete parity check | GitHub and GitLab each advertised 161 branches / 45 tags, but the SSM read was unavailable. An isolated canonical recheck succeeded and matched GitHub; GitLab still differed at one ref. Root observed a default HTTP/2 read timeout followed by HTTP/1 success; this sequence does not establish a protocol-related cause. |
| 12:29:43–12:29:54, final inventory | All three complete advertised maps matched, including peeled targets: 161 branches / 45 tags, zero missing, different or mirror-only entries. |

Reads and normal pushes ran while other work could advance refs. Counts from
different observations therefore describe their own timestamps rather than a
single atomic transaction. The final inventory, rather than an earlier push
exit code, establishes the equality stated above.

The repair used existing credentials and named normal pushes, with no force,
deletion, new grant, canonical reassignment or deployment. GitLab push options
`ci.skip`, `ci.no_pipeline` and `integrations.skip_ci` skipped backup-push
pipelines/integrations only. They are not evidence of a secret-protection or
security-policy bypass. No raw authentication output is packaged.

## Recovery use

1. Read the final inventory and its timestamp before relying on this checkpoint.
   Re-observe all advertised heads and tags on each host after any later work;
   compare both tag objects and peeled targets. Matching `main` alone is not an
   all-ref parity check.
2. For each missing or different named ref, establish current canonical identity,
   object availability and ancestry before proposing repair. Preserve any
   mirror-only work and classify divergence; do not infer a safe fast-forward
   from unequal hashes.
3. Review push-trigger effects for the specific historical refs. The 18-ref
   GitHub audit here does not cover arbitrary future refs or external hooks.
   Keep a repair bounded to authorized named creations/fast-forwards.
4. Retain failed receipts and perform fresh complete readbacks after repair.
   Treat unavailable reads as unknown. Repeated success or a smaller batch is
   not, by itself, a root-cause diagnosis or proof of unattended recurrence.

## Evidence integrity

The [evidence directory](../evidence/repository-parity-2026-10-20/manifest.json)
contains eleven original safe JSON receipts copied byte-for-byte, including
failures, plus a directly checked
[summary](../evidence/repository-parity-2026-10-20/verified-summary.json).
No source archives, dependency trees, raw process logs or credential values are
included. The selected credential-pattern check is a packaging check, not a
general secret audit.

Manifest SHA-256:
`51ca4997ee77fdf46c8618c628d56ce86e46e1e349bb8ba66e805b999afd6645`.
It records each file's byte length and exact SHA-256; the manifest itself is
identified by this digest. This documentation/package operation performed no
remote reads, ref writes, commit or push. Root owns subsequent review and
canonical persistence.
