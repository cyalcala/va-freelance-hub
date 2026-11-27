#![forbid(unsafe_code)]
//! Pure VA Freelance Hub math core (Wave 1).
//!
//! - [`types`]: MATH-00 shared types and version tags
//! - [`content_hash`]: MATH-09 content-hash input encodings (v1 legacy + v2 length-prefixed)
//! - [`processing_mode`]: MATH-10 processing-mode selector, including the F-W2-1 digest fix
//!
//! This crate has zero I/O, zero `unsafe`, and no external dependencies so it can
//! be translated by Charon → Aeneas → Lean 4. It does not write D1, touch Workers,
//! or change stored `contentHash@v1` rows.

pub mod content_hash;
pub mod processing_mode;
pub mod types;

pub use content_hash::{
    content_hash_v1, content_hash_v2, encode_v1_utf16, encode_v2_bytes, hash_utf16, hash_bytes,
    ContentHash, CONTENT_HASH_SCHEME_V1, CONTENT_HASH_SCHEME_V2, V2_PREFIX,
};
pub use processing_mode::{
    material_digests_changed, select_processing_mode, select_processing_mode_legacy,
    ModeDecision, ModeInput, ProcessingMode,
};
pub use types::{
    ContentHashVersion, Dependency, MaterialDigests, VersionDeps, CONTENT_HASH_VERSION_V1,
    CONTENT_HASH_VERSION_V2, WAVE1_CONTRACT_VERSION,
};
