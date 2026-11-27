//! MATH-00 — exact shared types and version tags for the Wave 1 core.
//!
//! These types are deliberately narrower than the TypeScript `SourceMemoryRecord`.
//! The TypeScript layer (not in this crate) remains responsible for I/O, ISO-8601
//! parsing, and mapping a live record onto [`ModeInput`](crate::ModeInput).

/// Contract version for this Wave 1 core. Bump only when the math rules change.
pub const WAVE1_CONTRACT_VERSION: u32 = 1;

/// Stored / declared content-hash scheme. `contentHash@v1` is the live D1 scheme
/// and must not be rewritten in place. `contentHash@v2` is the length-prefixed
/// scheme that closes F-W2-2.
pub const CONTENT_HASH_VERSION_V1: &str = "contentHash@v1";
pub const CONTENT_HASH_VERSION_V2: &str = "contentHash@v2";

#[derive(Clone, Copy, PartialEq, Eq)]
#[cfg_attr(test, derive(Debug))]
pub enum ContentHashVersion {
    V1,
    V2,
}

impl ContentHashVersion {
    pub fn tag(self) -> &'static str {
        match self {
            ContentHashVersion::V1 => CONTENT_HASH_VERSION_V1,
            ContentHashVersion::V2 => CONTENT_HASH_VERSION_V2,
        }
    }
}

/// Version dependency snapshot. Null TypeScript fields are represented as empty
/// slices so the core stays allocation-friendly for Aeneas.
#[derive(Clone, Copy, PartialEq, Eq)]
#[cfg_attr(test, derive(Debug))]
pub struct VersionDeps<'a> {
    pub policy_version: &'a str,
    pub processor_version: &'a str,
    pub geo_gate_version: &'a str,
    pub triage_version: &'a str,
    pub jev_version: &'a str,
    pub fingerprint_version: &'a str,
    pub content_hash_version: &'a str,
}

/// Material content digests for a source/job snapshot (SSAE-02 / MATH-10).
#[derive(Clone, Copy, PartialEq, Eq)]
#[cfg_attr(test, derive(Debug))]
pub struct MaterialDigests<'a> {
    pub fingerprint_hash: &'a str,
    pub content_hash: &'a str,
    pub description_hash: Option<&'a str>,
    pub policy_hash: &'a str,
}

/// Dependency kinds that invalidate a cached decision. Names match the
/// TypeScript `Dependency` union in `scripts/lake/source-ranker.ts`.
#[derive(Clone, Copy, PartialEq, Eq)]
#[cfg_attr(test, derive(Debug))]
pub enum Dependency {
    Geo,
    Remote,
    Identity,
    Url,
    SourceAuthority,
    Policy,
    Parser,
    Schema,
    Model,
    Taxonomy,
}

/// Current TypeScript defaults, mirrored for parity tests. Not a live
/// deployment attestation.
pub const CURRENT_VERSIONS: VersionDeps<'static> = VersionDeps {
    policy_version: "constitution-v5.2",
    processor_version: "capability-registry@1.0.0",
    geo_gate_version: "geoGate@2026-09-15",
    triage_version: "triage@1.0.0",
    jev_version: "jev-1.13",
    fingerprint_version: "fingerprint@v1",
    content_hash_version: CONTENT_HASH_VERSION_V1,
};
