"""Read-only integrity and reference audit for the portable Addy skill snapshot."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / ".agents/skills/addy-agent-skills-provenance.json"
REFERENCE = re.compile(r"(?<![A-Za-z0-9._/-])((?:\.\./)*references/[A-Za-z0-9._-]+\.md)")


def outside_fences(text: str) -> str:
    """Keep line positions while ignoring example code, as upstream's audit does."""
    lines = []
    fence = None
    for line in text.splitlines():
        match = re.match(r"^\s*(`{3,}|~{3,})", line)
        if match and fence is None:
            fence = match[1][0]
            lines.append("")
        elif match and fence == match[1][0]:
            fence = None
            lines.append("")
        else:
            lines.append("" if fence else line)
    return "\n".join(lines)


def audit() -> dict:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors = []
    for relative, expected in manifest["assets"].items():
        file = (ROOT / relative).resolve()
        if not file.is_relative_to(ROOT / ".agents") or not file.is_file():
            errors.append(f"Missing or out-of-scope asset: {relative}")
            continue
        digest = hashlib.sha256(file.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
        if digest != expected:
            errors.append(f"SHA256 mismatch: {relative}")
    names = sorted(p.parent.name for p in (ROOT / ".agents/skills").glob("*/SKILL.md"))
    if names != sorted(manifest["skills"]):
        errors.append("Direct installed skill inventory differs from provenance")
    files = []
    for name in manifest["skills"]:
        directory = ROOT / ".agents/skills" / name
        files.append(directory / "SKILL.md")
        files.extend(directory.glob("references/*.md"))
    links = 0
    for file in files:
        if not file.is_file():
            continue
        for line_number, line in enumerate(outside_fences(file.read_text(encoding="utf-8")).splitlines(), 1):
            for match in REFERENCE.finditer(line):
                links += 1
                target = (file.parent / match[1]).resolve()
                if not target.is_file():
                    errors.append(f"Unresolved reference: {file.relative_to(ROOT)}:{line_number}: {match[1]}")
    return {"skills": len(names), "assets": len(manifest["assets"]), "reference_files_checked": len(files),
            "reference_links": links, "errors": errors, "passed": not errors}


if __name__ == "__main__":
    result = audit()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["passed"] else 1)
