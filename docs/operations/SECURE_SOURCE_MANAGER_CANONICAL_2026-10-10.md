# Secure Source Manager canonical remote — 2026-10-10

Verified readback of the full local history on Google Cloud Secure Source
Manager. This receipt is the canonical Git remote from this commit forward.
GitLab stays a secondary mirror. The GitHub remote remains available locally
under the name `github`.

| Fact | Value |
| --- | --- |
| Project | `antigravity-494415` |
| Instance | `va-freelance-hub` |
| Region | `asia-northeast1` |
| Repository | `va-freelance-hub` |
| Git URL | `https://va-freelance-hub-296059249147-git.asia-northeast1.sourcemanager.dev/antigravity-494415/va-freelance-hub.git` |
| HTML | `https://va-freelance-hub-296059249147.asia-northeast1.sourcemanager.dev/antigravity-494415/va-freelance-hub` |
| Verified branch | `codex/verified-flow-directory-checkpoint` |
| Verified SHA | `073f4a5462cf7e04730aa5e5e1c8562b242bf3f9` |
| `main` | `f35bcdc3a2b341b62b22adcf6f0f2e279ed4e6e5` |
| Remote default HEAD | `main` at that same SHA |
| Preserved GitLab `main` | `refs/heads/mirror/gitlab/main` at `fbeff64a2b47f32550ba426af92a2795a1507181` |
| Heads | 155 |
| Tags | 45 |
| Reachable commits | 2702 |

The comparison was `git ls-remote` against every local branch, every local
tag, every GitHub-only branch tip, and `mirror/gitlab/main`. Missing refs: 0.
Mismatched SHAs: 0. The only extra remote name was the default `HEAD`, and it
points at local `main`. A fetch into `refs/remotes/origin/*` then counted
2702 commits, equal to the commits reachable from local branches, tags, and
the retained GitHub and GitLab remote-tracking refs.

Pushes were ordinary atomic ref updates. No force and no mirror overwrite.
Local branch tips won where a same-named GitHub tip differed. The six
untracked audit, skill, and maintenance paths stayed unstaged.

Cloud Run, Scheduler, Artifact Registry, Turso, D1, and Cloudflare were not
changed. Migration 0056 was not applied to production. Accepted MATH remains
0/13. Certified daily flow remains UNKNOWN. The directory was not enriched.
GitHub was not probed. The denied GitLab push was not retried.
