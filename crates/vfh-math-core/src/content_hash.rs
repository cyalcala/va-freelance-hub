//! MATH-09 — content-hash input encodings.
//!
//! # F-W2-2 (recorded on `main`, still live in TypeScript)
//! `toContentHash(t, u)` hashes the concatenation `t + "::" + u` with no length
//! prefix. Therefore
//! `toContentHash("A", "B::C") == toContentHash("A::B", "C")`.
//!
//! # Wave 1 fix (this crate only; D1 is not rewritten)
//! - [`content_hash_v1`] reproduces the live TypeScript scheme byte-for-byte
//!   (UTF-16 / `charCodeAt` + cyrb53, 16 lowercase hex chars) so we can keep
//!   parity tests and so existing `contentHash@v1` rows stay meaningful.
//! - [`content_hash_v2`] hashes a length-prefixed UTF-8 encoding and prefixes
//!   the digest with [`V2_PREFIX`] (`"v2:"`). A v2 digest can never be confused
//!   with a stored 16-hex v1 row, so D1 is not invalidated blindly.
//!
//! The length-prefixed encoding itself is injective on byte strings. The 64-bit
//! fingerprint still has a birthday bound; F-W2-2 is an *encoding* collision,
//! which v2 closes.

use crate::types::ContentHashVersion;

/// ASCII prefix that marks a v2 digest. v1 digests are exactly 16 hex chars.
pub const V2_PREFIX: &str = "v2:";
pub const CONTENT_HASH_SCHEME_V1: &str = "v1-utf16-colon-concat-cyrb53";
pub const CONTENT_HASH_SCHEME_V2: &str = "v2-utf8-u32be-length-prefixed-cyrb53";

const HEX: &[u8; 16] = b"0123456789abcdef";

/// A versioned content-hash digest. `hex` is the 16-char cyrb53 body, never
/// including the `v2:` prefix (the prefix is applied by [`ContentHash::display`]).
#[derive(Clone, Copy, PartialEq, Eq)]
#[cfg_attr(test, derive(Debug))]
pub struct ContentHash {
    pub version: ContentHashVersion,
    pub hex: [u8; 16],
}

impl ContentHash {
    /// v1: 16 hex chars. v2: `v2:` + 16 hex chars (19 bytes).
    pub fn display(self, out: &mut [u8]) -> usize {
        match self.version {
            ContentHashVersion::V1 => {
                out[..16].copy_from_slice(&self.hex);
                16
            }
            ContentHashVersion::V2 => {
                out[..3].copy_from_slice(b"v2:");
                out[3..19].copy_from_slice(&self.hex);
                19
            }
        }
    }

    pub fn is_v2_display(bytes: &[u8]) -> bool {
        bytes.len() == 19 && bytes[0] == b'v' && bytes[1] == b'2' && bytes[2] == b':'
    }
}

/// JS `Math.imul` — 32-bit wrapping signed multiply.
fn imul(a: i32, b: i32) -> i32 {
    a.wrapping_mul(b)
}

/// Unsigned JS `>>>` of an i32 value, returned as i32 with the same bit pattern.
fn usr(x: i32, shift: u32) -> i32 {
    ((x as u32) >> shift) as i32
}

fn cyrb53_finish(mut h1: i32, mut h2: i32) -> [u8; 16] {
    h1 = imul(h1 ^ usr(h1, 16), 2246822507u32 as i32)
        ^ imul(h2 ^ usr(h2, 13), 3266489909u32 as i32);
    h2 = imul(h2 ^ usr(h2, 16), 2246822507u32 as i32)
        ^ imul(h1 ^ usr(h1, 13), 3266489909u32 as i32);
    let a = h1 as u32;
    let b = h2 as u32;
    let mut lo = [0u8; 8];
    let mut hi = [0u8; 8];
    write_hex8(a, &mut lo);
    write_hex8(b, &mut hi);
    let mut hex = [0u8; 16];
    hex[0] = lo[0];
    hex[1] = lo[1];
    hex[2] = lo[2];
    hex[3] = lo[3];
    hex[4] = lo[4];
    hex[5] = lo[5];
    hex[6] = lo[6];
    hex[7] = lo[7];
    hex[8] = hi[0];
    hex[9] = hi[1];
    hex[10] = hi[2];
    hex[11] = hi[3];
    hex[12] = hi[4];
    hex[13] = hi[5];
    hex[14] = hi[6];
    hex[15] = hi[7];
    hex
}

fn hex_digit(nibble: u32) -> u8 {
    HEX[(nibble & 0xf) as usize]
}

fn write_hex8(value: u32, out: &mut [u8; 8]) {
    out[0] = hex_digit(value >> 28);
    out[1] = hex_digit(value >> 24);
    out[2] = hex_digit(value >> 20);
    out[3] = hex_digit(value >> 16);
    out[4] = hex_digit(value >> 12);
    out[5] = hex_digit(value >> 8);
    out[6] = hex_digit(value >> 4);
    out[7] = hex_digit(value);
}

/// cyrb53 over UTF-16 code units, matching `hashString` in
/// `packages/scraper/contentHash.ts` (`charCodeAt` iteration).
pub fn hash_utf16(units: &[u16]) -> [u8; 16] {
    let mut h1: i32 = 0xdeadbeefu32 as i32;
    let mut h2: i32 = 0x41c6ce57u32 as i32;
    let mut i = 0;
    while i < units.len() {
        let ch = units[i] as i32;
        h1 = imul(h1 ^ ch, 2654435761u32 as i32);
        h2 = imul(h2 ^ ch, 1597334677u32 as i32);
        i += 1;
    }
    cyrb53_finish(h1, h2)
}

/// cyrb53 over raw bytes (each byte is mixed as a code unit 0..=255).
/// Used only by the v2 scheme.
pub fn hash_bytes(bytes: &[u8]) -> [u8; 16] {
    let mut h1: i32 = 0xdeadbeefu32 as i32;
    let mut h2: i32 = 0x41c6ce57u32 as i32;
    let mut i = 0;
    while i < bytes.len() {
        let ch = bytes[i] as i32;
        h1 = imul(h1 ^ ch, 2654435761u32 as i32);
        h2 = imul(h2 ^ ch, 1597334677u32 as i32);
        i += 1;
    }
    cyrb53_finish(h1, h2)
}

/// Legacy v1 input encoding: UTF-16 title, then `::`, then UTF-16 url.
/// This function exists so the F-W2-2 collision can be stated exactly.
pub fn encode_v1_utf16(title: &[u16], url: &[u16], out: &mut [u16]) -> usize {
    let need = title.len() + 2 + url.len();
    let mut i = 0;
    while i < title.len() {
        out[i] = title[i];
        i += 1;
    }
    out[i] = 0x3a;
    i += 1;
    out[i] = 0x3a;
    i += 1;
    let mut j = 0;
    while j < url.len() {
        out[i] = url[j];
        i += 1;
        j += 1;
    }
    let _ = need;
    i
}

/// v2 input encoding: `u32be(len(title)) || title || u32be(len(url)) || url`.
///
/// This is injective on `(title, url)` byte-string pairs: the first four bytes
/// tell the reader exactly how many title bytes follow, so a `::` (or any other
/// byte sequence) inside the title cannot be confused with a delimiter.
pub fn encode_v2_bytes(title: &[u8], url: &[u8], out: &mut [u8]) -> Option<usize> {
    if title.len() > (u32::MAX as usize) || url.len() > (u32::MAX as usize) {
        return None;
    }
    let need = 8 + title.len() + url.len();
    if out.len() < need {
        return None;
    }
    write_u32be(title.len() as u32, &mut out[0..4]);
    let mut i = 4;
    let mut j = 0;
    while j < title.len() {
        out[i] = title[j];
        i += 1;
        j += 1;
    }
    write_u32be(url.len() as u32, &mut out[i..i + 4]);
    i += 4;
    j = 0;
    while j < url.len() {
        out[i] = url[j];
        i += 1;
        j += 1;
    }
    Some(i)
}

fn write_u32be(value: u32, out: &mut [u8]) {
    out[0] = (value >> 24) as u8;
    out[1] = (value >> 16) as u8;
    out[2] = (value >> 8) as u8;
    out[3] = value as u8;
}

fn cyrb53_start() -> (i32, i32) {
    (0xdeadbeefu32 as i32, 0x41c6ce57u32 as i32)
}

fn cyrb53_mix_u16(h1: i32, h2: i32, ch: u16) -> (i32, i32) {
    let c = ch as i32;
    (imul(h1 ^ c, 2654435761u32 as i32), imul(h2 ^ c, 1597334677u32 as i32))
}

fn cyrb53_mix_u8(h1: i32, h2: i32, ch: u8) -> (i32, i32) {
    let c = ch as i32;
    (imul(h1 ^ c, 2654435761u32 as i32), imul(h2 ^ c, 1597334677u32 as i32))
}

fn cyrb53_mix_u32be(mut h1: i32, mut h2: i32, value: u32) -> (i32, i32) {
    let b0 = (value >> 24) as u8;
    let b1 = (value >> 16) as u8;
    let b2 = (value >> 8) as u8;
    let b3 = value as u8;
    let t = cyrb53_mix_u8(h1, h2, b0);
    h1 = t.0;
    h2 = t.1;
    let t = cyrb53_mix_u8(h1, h2, b1);
    h1 = t.0;
    h2 = t.1;
    let t = cyrb53_mix_u8(h1, h2, b2);
    h1 = t.0;
    h2 = t.1;
    cyrb53_mix_u8(h1, h2, b3)
}

/// Live TypeScript `toContentHash(title, url)`: UTF-16 `title::url` + cyrb53.
/// Streamed (no scratch buffer) so the mix is identical to hashing the
/// concatenated encoding.
pub fn content_hash_v1(title_utf16: &[u16], url_utf16: &[u16]) -> ContentHash {
    let t = cyrb53_start();
    let mut h1 = t.0;
    let mut h2 = t.1;
    let mut i = 0;
    while i < title_utf16.len() {
        let t = cyrb53_mix_u16(h1, h2, title_utf16[i]);
        h1 = t.0;
        h2 = t.1;
        i += 1;
    }
    let t = cyrb53_mix_u16(h1, h2, 0x3a);
    h1 = t.0;
    h2 = t.1;
    let t = cyrb53_mix_u16(h1, h2, 0x3a);
    h1 = t.0;
    h2 = t.1;
    i = 0;
    while i < url_utf16.len() {
        let t = cyrb53_mix_u16(h1, h2, url_utf16[i]);
        h1 = t.0;
        h2 = t.1;
        i += 1;
    }
    ContentHash {
        version: ContentHashVersion::V1,
        hex: cyrb53_finish(h1, h2),
    }
}

/// Length-prefixed v2 hash. Output display is `v2:` + 16 hex chars.
/// Returns `None` only if a length overflows `u32` (cannot happen for
/// in-memory slices on this platform in practice, but the check is kept
/// so the function never truncates silently).
pub fn content_hash_v2(title_utf8: &[u8], url_utf8: &[u8]) -> Option<ContentHash> {
    if title_utf8.len() > (u32::MAX as usize) || url_utf8.len() > (u32::MAX as usize) {
        return None;
    }
    let t = cyrb53_start();
    let mut h1 = t.0;
    let mut h2 = t.1;
    let t = cyrb53_mix_u32be(h1, h2, title_utf8.len() as u32);
    h1 = t.0;
    h2 = t.1;
    let mut i = 0;
    while i < title_utf8.len() {
        let t = cyrb53_mix_u8(h1, h2, title_utf8[i]);
        h1 = t.0;
        h2 = t.1;
        i += 1;
    }
    let t = cyrb53_mix_u32be(h1, h2, url_utf8.len() as u32);
    h1 = t.0;
    h2 = t.1;
    i = 0;
    while i < url_utf8.len() {
        let t = cyrb53_mix_u8(h1, h2, url_utf8[i]);
        h1 = t.0;
        h2 = t.1;
        i += 1;
    }
    Some(ContentHash {
        version: ContentHashVersion::V2,
        hex: cyrb53_finish(h1, h2),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encode_str_utf16(s: &str, out: &mut [u16]) -> Option<usize> {
        let mut n = 0;
        for ch in s.encode_utf16() {
            if n >= out.len() {
                return None;
            }
            out[n] = ch;
            n += 1;
        }
        Some(n)
    }

    fn v1_str(title: &str, url: &str) -> [u8; 16] {
        let mut t = [0u16; 256];
        let mut u = [0u16; 256];
        let tn = encode_str_utf16(title, &mut t).unwrap();
        let un = encode_str_utf16(url, &mut u).unwrap();
        content_hash_v1(&t[..tn], &u[..un]).hex
    }

    fn v2_disp(title: &str, url: &str) -> [u8; 19] {
        let h = content_hash_v2(title.as_bytes(), url.as_bytes()).unwrap();
        let mut out = [0u8; 19];
        let n = h.display(&mut out);
        assert_eq!(n, 19);
        out
    }

    fn hex16(h: [u8; 16]) -> String {
        String::from_utf8(h.to_vec()).unwrap()
    }

    #[test]
    fn hash_string_matches_typescript_fixtures() {
        let empty: [u16; 0] = [];
        assert_eq!(hex16(hash_utf16(&empty)), "1aee8d83488bdcb8");
        let mut hello = [0u16; 8];
        let n = encode_str_utf16("hello", &mut hello).unwrap();
        assert_eq!(hex16(hash_utf16(&hello[..n])), "63cd7226bfb06f3a");
        let mut a = [0u16; 2];
        let n = encode_str_utf16("A", &mut a).unwrap();
        assert_eq!(hex16(hash_utf16(&a[..n])), "f46a017db3afc47f");
    }

    #[test]
    fn v1_matches_typescript_tocontenthash() {
        assert_eq!(
            hex16(v1_str(
                "Virtual Assistant — Remote",
                "https://example.invalid/jobs/1"
            )),
            "2436a0baf741a4d9"
        );
        assert_eq!(
            hex16(v1_str(
                "Virtual Assistant — Remote",
                "https://example.invalid/jobs/2"
            )),
            "04aabe617b503925"
        );
    }

    #[test]
    fn f_w2_2_v1_colon_alias_is_real() {
        // Characterization of the live TypeScript bug, preserved as a fixture.
        let left = v1_str("A", "B::C");
        let right = v1_str("A::B", "C");
        assert_eq!(hex16(left), "5e24bcea38eadbb7");
        assert_eq!(left, right);
        let left2 = v1_str("Engineer::Senior", "https://example.invalid/x");
        let right2 = v1_str("Engineer", "Senior::https://example.invalid/x");
        assert_eq!(hex16(left2), "35b59c9cb6bcbc33");
        assert_eq!(left2, right2);
    }

    #[test]
    fn f_w2_2_v2_length_prefix_rejects_the_alias() {
        let left = v2_disp("A", "B::C");
        let right = v2_disp("A::B", "C");
        assert_ne!(left, right);
        assert!(ContentHash::is_v2_display(&left));
        assert!(ContentHash::is_v2_display(&right));
        let left2 = v2_disp("Engineer::Senior", "https://example.invalid/x");
        let right2 = v2_disp("Engineer", "Senior::https://example.invalid/x");
        assert_ne!(left2, right2);
    }

    #[test]
    fn v2_display_cannot_collide_with_v1_row_shape() {
        let v1 = v1_str("A", "https://example.invalid/x");
        assert_eq!(v1.len(), 16);
        let v2 = v2_disp("A", "https://example.invalid/x");
        assert_eq!(v2.len(), 19);
        assert_ne!(&v2[3..], &v1[..]); // not required, but prefix already distinguishes
        assert_eq!(&v2[..3], b"v2:");
    }

    #[test]
    fn v2_encoding_roundtrip_lengths() {
        let title = b"hello";
        let url = b"https://example.invalid/x";
        let mut buf = [0u8; 64];
        let n = encode_v2_bytes(title, url, &mut buf).unwrap();
        assert_eq!(n, 8 + title.len() + url.len());
        assert_eq!(&buf[0..4], &[0, 0, 0, 5]);
        assert_eq!(&buf[4..9], b"hello");
        assert_eq!(&buf[9..13], &[0, 0, 0, url.len() as u8]);
        assert_eq!(&buf[13..n], url);
    }

    #[test]
    fn v1_is_deterministic() {
        assert_eq!(
            v1_str("Virtual Assistant — Remote", "https://example.invalid/jobs/1"),
            v1_str("Virtual Assistant — Remote", "https://example.invalid/jobs/1")
        );
    }
}
