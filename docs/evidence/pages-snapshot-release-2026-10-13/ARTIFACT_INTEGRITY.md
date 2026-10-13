# Artifact byte preservation

The cache release was built from exact source34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83.
Build and preflight receipts identify their own raw SHA-256 inputs.

After the first evidence commit aabc1715e9846a3ef969c6c5bae5faad02fa1050,
root compared Git blobs with those raw hashes and found that already-staged
Windows logs had been normalized to LF before the new -text attributes took
effect. Local original captures remained intact. Explicit renormalization under
the byte-preserving attributes restored the original bytes to the Git index.
All five build-log hashes and three preflight artifact hashes then matched the
staged blobs exactly. This repair changes evidence byte storage only; it does
not change the built or deployed source or reinterpret a test result.

Read build.json for84 distribution-file digests and the canonical manifest
digest48aa37dca7a780443145d8383939e0a530c9ffd883ec09b45ece8741e7bb918c.
Local build hashes and uploaded commit metadata are separate from attestation
of remote Pages function bytes. The supported old deployment rollback remains
documented in PREFLIGHT_AND_ROLLBACK.md.
