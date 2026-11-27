//! MATH-10 - exclusive processing-mode selection with material-digest invalidation.
//!
//! The TypeScript `selectProcessingMode` in `scripts/lake/source-ranker.ts`
//! (characterized in `scripts/lake/math-wave2-characterization.test.ts`) reads
//! `version_deps` but does not compare `material_digests` values. A changed
//! content hash under an unchanged `content_hash_version` is therefore still
//! classified `REUSE`. That is finding F-W2-1.
//!
//! This module:
//! - [`select_processing_mode_legacy`] reproduces that TypeScript behaviour for
//!   parity tests (including the F-W2-1 fixture, which must stay `Reuse`).
//! - [`select_processing_mode`] is the Wave 1 corrected selector: when a cached
//!   digest snapshot is supplied and a material field changed, the mode is
//!   `BoundedReplay` with an `Identity` dependency, after opt-out / expiry
//!   (which still outrank) and alongside the existing version ladder.

use crate::types::{Dependency, MaterialDigests, VersionDeps};

#[derive(Clone, Copy, PartialEq, Eq)]
#[cfg_attr(test, derive(Debug))]
pub enum ProcessingMode {
    Full,
    Reindex,
    Reuse,
    BoundedReplay,
}

#[derive(Clone, Copy)]
#[cfg_attr(test, derive(Debug))]
pub struct ModeInput<'a> {
    pub opt_out: bool,
    /// Absolute milliseconds, if a policy lease exists. Unparseable TypeScript
    /// dates are mapped to `None` by the (future) TS façade, matching the live
    /// `new Date(invalid) < new Date()` behaviour (the comparison is false).
    pub policy_expiry_ms: Option<u64>,
    pub lease_expiry_ms: Option<u64>,
    pub version_deps: VersionDeps<'a>,
    pub last_qualified_ready: i32,
    pub last_candidate_count: i32,
    pub material_digests: MaterialDigests<'a>,
}

#[derive(Clone, Copy)]
#[cfg_attr(test, derive(Debug))]
pub struct ModeDecision {
    pub mode: ProcessingMode,
    pub reason: &'static str,
    pub dependency_count: usize,
}

const MAX_DEPS: usize = 8;

fn push_dep(deps: &mut [Dependency; MAX_DEPS], count: &mut usize, dep: Dependency) {
    if *count < MAX_DEPS {
        deps[*count] = dep;
        *count += 1;
    }
}

fn is_unknown_version(value: &str) -> bool {
    if value.is_empty() {
        return true;
    }
    value == "unknown" || value == "unversioned"
}

fn check_version_mismatch(
    stored: VersionDeps<'_>,
    current: VersionDeps<'_>,
    out: &mut [Dependency; MAX_DEPS],
    has_unknown: &mut bool,
) -> usize {
    let mut n = 0;
    // Order matches source-ranker.ts checkVersionMismatch.
    check_one(stored.policy_version, current.policy_version, Dependency::Policy, out, &mut n, has_unknown);
    check_one(stored.processor_version, current.processor_version, Dependency::Parser, out, &mut n, has_unknown);
    check_one(stored.geo_gate_version, current.geo_gate_version, Dependency::Geo, out, &mut n, has_unknown);
    check_one(stored.triage_version, current.triage_version, Dependency::Taxonomy, out, &mut n, has_unknown);
    check_one(stored.jev_version, current.jev_version, Dependency::Model, out, &mut n, has_unknown);
    check_one(stored.fingerprint_version, current.fingerprint_version, Dependency::Identity, out, &mut n, has_unknown);
    check_one(stored.content_hash_version, current.content_hash_version, Dependency::Identity, out, &mut n, has_unknown);
    n
}

fn check_one(
    stored: &str,
    current: &str,
    dep: Dependency,
    out: &mut [Dependency; MAX_DEPS],
    n: &mut usize,
    has_unknown: &mut bool,
) {
    if stored != current {
        push_dep(out, n, dep);
        if is_unknown_version(stored) {
            *has_unknown = true;
        }
    }
}

fn is_targeted(dep: Dependency) -> bool {
    matches!(
        dep,
        Dependency::Geo | Dependency::Taxonomy | Dependency::Identity | Dependency::Policy
    )
}

/// Material-field comparison used by the F-W2-1 fix.
///
/// `description_hash` is optional in the live contract: a missing description
/// alone does not disqualify `REUSE` in the TypeScript characterization, so a
/// `None` on either side is not treated as a change. If both are present and
/// differ, that is a material change.
pub fn material_digests_changed(current: MaterialDigests<'_>, cached: MaterialDigests<'_>) -> bool {
    if current.fingerprint_hash != cached.fingerprint_hash {
        return true;
    }
    if current.content_hash != cached.content_hash {
        return true;
    }
    if current.policy_hash != cached.policy_hash {
        return true;
    }
    match (current.description_hash, cached.description_hash) {
        (Some(a), Some(b)) => a != b,
        _ => false,
    }
}

fn sufficient_evidence(input: &ModeInput<'_>) -> bool {
    input.last_qualified_ready > 0
        && input.last_candidate_count > 0
        && !input.material_digests.fingerprint_hash.is_empty()
        && !input.material_digests.content_hash.is_empty()
}

fn decide_legacy(
    input: &ModeInput<'_>,
    current: VersionDeps<'_>,
    now_ms: u64,
) -> (ProcessingMode, &'static str, [Dependency; MAX_DEPS], usize) {
    let empty = [Dependency::Geo; MAX_DEPS];
    if input.opt_out {
        let mut deps = empty;
        let mut n = 0;
        push_dep(&mut deps, &mut n, Dependency::SourceAuthority);
        push_dep(&mut deps, &mut n, Dependency::Policy);
        return (
            ProcessingMode::BoundedReplay,
            "Source opted out - withdrawal propagation required",
            deps,
            n,
        );
    }
    if let Some(exp) = input.policy_expiry_ms {
        if exp < now_ms {
            let mut deps = empty;
            let mut n = 0;
            push_dep(&mut deps, &mut n, Dependency::Policy);
            push_dep(&mut deps, &mut n, Dependency::SourceAuthority);
            return (
                ProcessingMode::BoundedReplay,
                "Policy lease expired - re-evaluation required",
                deps,
                n,
            );
        }
    }
    if let Some(exp) = input.lease_expiry_ms {
        if exp < now_ms {
            let mut deps = empty;
            let mut n = 0;
            push_dep(&mut deps, &mut n, Dependency::SourceAuthority);
            return (
                ProcessingMode::BoundedReplay,
                "Evidence lease expired - fresh evidence required",
                deps,
                n,
            );
        }
    }

    let mut mismatches = empty;
    let mut has_unknown = false;
    let n = check_version_mismatch(input.version_deps, current, &mut mismatches, &mut has_unknown);
    if n > 0 {
        if has_unknown {
            return (
                ProcessingMode::Full,
                "Unknown version dependency - conservative FULL required",
                mismatches,
                n,
            );
        }
        if n == 1 && is_targeted(mismatches[0]) {
            return (
                ProcessingMode::BoundedReplay,
                "Targeted dependency version change",
                mismatches,
                n,
            );
        }
        return (
            ProcessingMode::Reindex,
            "Version mismatch",
            mismatches,
            n,
        );
    }

    if sufficient_evidence(input) {
        return (ProcessingMode::Reuse, "Sufficient compatible evidence exists; no dependency changes", empty, 0);
    }
    (
        ProcessingMode::Full,
        "Insufficient prior evidence or first evaluation",
        empty,
        0,
    )
}

/// TypeScript-parity selector. Preserves F-W2-1 (`Reuse` despite a digest
/// change) because the live function never receives a cached digest.
pub fn select_processing_mode_legacy(
    input: &ModeInput<'_>,
    current: VersionDeps<'_>,
    now_ms: u64,
) -> ModeDecision {
    let (mode, reason, _deps, n) = decide_legacy(input, current, now_ms);
    ModeDecision {
        mode,
        reason,
        dependency_count: n,
    }
}

/// Corrected Wave 1 selector. `cached_digests` is the digest snapshot the
/// cached decision was produced under. When it is `None`, behaviour matches
/// the legacy selector. When it is `Some` and a material field changed, a
/// version-compatible record is no longer `Reuse`.
pub fn select_processing_mode(
    input: &ModeInput<'_>,
    current: VersionDeps<'_>,
    now_ms: u64,
    cached_digests: Option<MaterialDigests<'_>>,
) -> ModeDecision {
    let (mode, reason, _deps, n) = decide_legacy(input, current, now_ms);
    // Opt-out, expiry, version mismatch and insufficient evidence already
    // outrank a digest comparison. Only a would-be Reuse is upgraded.
    if mode == ProcessingMode::Reuse {
        if let Some(cached) = cached_digests {
            if material_digests_changed(input.material_digests, cached) {
                return ModeDecision {
                    mode: ProcessingMode::BoundedReplay,
                    reason: "Material digest changed - cached mode is not content-valid",
                    dependency_count: 1,
                };
            }
        }
    }
    ModeDecision {
        mode,
        reason,
        dependency_count: n,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{CURRENT_VERSIONS, CONTENT_HASH_VERSION_V2, MaterialDigests, VersionDeps};

    const T0: u64 = 1_000_000;
    const NOW: u64 = 2_000_000;

    fn digests() -> MaterialDigests<'static> {
        MaterialDigests {
            fingerprint_hash: "fp-1",
            content_hash: "ch-1",
            description_hash: Some("dh-1"),
            policy_hash: "ph-1",
        }
    }

    fn input() -> ModeInput<'static> {
        ModeInput {
            opt_out: false,
            policy_expiry_ms: None,
            lease_expiry_ms: None,
            version_deps: CURRENT_VERSIONS,
            last_qualified_ready: 3,
            last_candidate_count: 5,
            material_digests: digests(),
        }
    }

    #[test]
    fn opt_out_outranks_everything() {
        let mut i = input();
        i.opt_out = true;
        let changed = MaterialDigests {
            content_hash: "ch-CHANGED",
            ..digests()
        };
        i.material_digests = changed;
        let d = select_processing_mode(&i, CURRENT_VERSIONS, NOW, Some(digests()));
        assert_eq!(d.mode, ProcessingMode::BoundedReplay);
        assert!(d.reason.contains("opted out"));
    }

    #[test]
    fn policy_and_lease_expiry_force_bounded_replay() {
        let mut i = input();
        i.policy_expiry_ms = Some(T0);
        assert_eq!(
            select_processing_mode_legacy(&i, CURRENT_VERSIONS, NOW).mode,
            ProcessingMode::BoundedReplay
        );
        let mut j = input();
        j.lease_expiry_ms = Some(T0);
        assert_eq!(
            select_processing_mode_legacy(&j, CURRENT_VERSIONS, NOW).mode,
            ProcessingMode::BoundedReplay
        );
        // A future expiry is not expired.
        let mut k = input();
        k.policy_expiry_ms = Some(NOW + 10);
        assert_eq!(
            select_processing_mode_legacy(&k, CURRENT_VERSIONS, NOW).mode,
            ProcessingMode::Reuse
        );
    }

    #[test]
    fn targeted_content_hash_version_is_bounded_replay() {
        let mut i = input();
        i.version_deps = VersionDeps {
            content_hash_version: CONTENT_HASH_VERSION_V2,
            ..CURRENT_VERSIONS
        };
        let d = select_processing_mode_legacy(&i, CURRENT_VERSIONS, NOW);
        assert_eq!(d.mode, ProcessingMode::BoundedReplay);
    }

    #[test]
    fn unknown_version_is_full() {
        let mut i = input();
        i.version_deps = VersionDeps {
            policy_version: "unknown",
            ..CURRENT_VERSIONS
        };
        let d = select_processing_mode_legacy(&i, CURRENT_VERSIONS, NOW);
        assert_eq!(d.mode, ProcessingMode::Full);
    }

    #[test]
    fn insufficient_evidence_is_full() {
        let mut i = input();
        i.last_qualified_ready = 0;
        assert_eq!(
            select_processing_mode_legacy(&i, CURRENT_VERSIONS, NOW).mode,
            ProcessingMode::Full
        );
        let mut j = input();
        j.material_digests = MaterialDigests {
            content_hash: "",
            ..digests()
        };
        assert_eq!(
            select_processing_mode_legacy(&j, CURRENT_VERSIONS, NOW).mode,
            ProcessingMode::Full
        );
        // Missing description alone still reuses (TypeScript characterization).
        let mut k = input();
        k.material_digests = MaterialDigests {
            description_hash: None,
            ..digests()
        };
        assert_eq!(
            select_processing_mode_legacy(&k, CURRENT_VERSIONS, NOW).mode,
            ProcessingMode::Reuse
        );
    }

    #[test]
    fn f_w2_1_legacy_reuses_changed_digest() {
        let mut i = input();
        i.material_digests = MaterialDigests {
            content_hash: "ch-CHANGED",
            ..digests()
        };
        // The live TypeScript function has no cached-digest argument, so a
        // changed hash with matching versions is still Reuse.
        let d = select_processing_mode_legacy(&i, CURRENT_VERSIONS, NOW);
        assert_eq!(d.mode, ProcessingMode::Reuse);
        // The corrected selector, given the previously cached digests, refuses.
        let fixed = select_processing_mode(&i, CURRENT_VERSIONS, NOW, Some(digests()));
        assert_eq!(fixed.mode, ProcessingMode::BoundedReplay);
        assert!(fixed.reason.contains("Material digest changed"));
    }

    #[test]
    fn corrected_selector_reuses_when_digests_match() {
        let i = input();
        let d = select_processing_mode(&i, CURRENT_VERSIONS, NOW, Some(digests()));
        assert_eq!(d.mode, ProcessingMode::Reuse);
    }

    #[test]
    fn processor_or_model_mismatch_is_reindex() {
        let mut i = input();
        i.version_deps = VersionDeps {
            processor_version: "capability-registry@0.0.0",
            ..CURRENT_VERSIONS
        };
        assert_eq!(
            select_processing_mode_legacy(&i, CURRENT_VERSIONS, NOW).mode,
            ProcessingMode::Reindex
        );
    }
}
