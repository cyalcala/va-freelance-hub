#!/usr/bin/env python3
"""Stream untrusted Workable XML into bounded metadata-only JSONL, offline.

SAX discards description character chunks immediately. ElementTree iterparse
would first allocate the complete text of each description. No third-party
dependencies, entity resolution, network access, or public database writes.
"""
import argparse
import json
import os
import re
from pathlib import Path
import tempfile
import time
import xml.sax
from xml.sax.handler import ContentHandler, EntityResolver, property_lexical_handler
from xml.sax.handler import feature_external_ges, feature_external_pes

MAX_INPUT_BYTES = 512 * 1024 * 1024
MAX_OUTPUT_BYTES = 32 * 1024 * 1024
MAX_FIELD_BYTES = 16 * 1024
MAX_MARKUP_BYTES = 16 * 1024
MAX_DEPTH = 32
MAX_JOBS = 100_000
MAX_SECONDS = 120
FIELDS = ("referencenumber", "title", "url", "company", "city", "state",
          "country", "remote", "jobtype", "category", "date")
REQUIRED = ("referencenumber", "title", "url", "company")


class LexicalBudgetGuard:
    """Reject large incomplete tokens before Expat can buffer them.

    Only bounded prefixes and delimiter tails survive between chunks. Plain
    text and CDATA descriptions remain streaming; tags, attributes, comments,
    processing instructions and entity references have a 16 KiB ceiling.
    SAX still owns XML validity; this scanner only enforces resource bounds.
    """
    TEXT_MARKER = re.compile(br"[<&]")
    TAG_MARKER = re.compile(br"[\"'>]")
    PREFIXES = (b"<!--", b"<![CDATA[", b"<!DOCTYPE", b"<?")

    def __init__(self):
        self.mode = "text"
        self.prefix = b""
        self.tail = b""
        self.quote = None
        self.token_bytes = 0

    def count(self, amount):
        self.token_bytes += amount
        if self.token_bytes > MAX_MARKUP_BYTES:
            raise ValueError("XML lexical token exceeds byte budget")

    def feed(self, chunk):
        # UTF-16/32 markup would bypass an ASCII-delimiter scanner. Workable
        # is UTF-8; NULs are invalid in UTF-8 XML and fail closed here.
        if b"\x00" in chunk:
            raise ValueError("NUL or unsupported UTF-16/32 XML encoding")
        position = 0
        while position < len(chunk):
            if self.mode == "text":
                match = self.TEXT_MARKER.search(chunk, position)
                if match is None:
                    return
                marker = match.group()
                position = match.end()
                self.token_bytes = 1
                self.mode = "prefix" if marker == b"<" else "entity"
                self.prefix = marker
            elif self.mode == "prefix":
                char = chunk[position:position + 1]
                position += 1
                self.prefix += char
                self.count(1)
                if self.prefix == b"<!DOCTYPE":
                    raise ValueError("DOCTYPE and XML entity declarations are prohibited")
                if self.prefix in (b"<!--", b"<![CDATA[", b"<?"):
                    self.mode = {b"<!--": "comment", b"<![CDATA[": "cdata", b"<?": "pi"}[self.prefix]
                    self.tail = b""
                elif not any(value.startswith(self.prefix) for value in self.PREFIXES):
                    self.mode = "text" if char == b">" else "tag"
                    self.quote = char if char in (b"'", b'"') else None
            elif self.mode == "tag":
                if self.quote is not None:
                    ending = chunk.find(self.quote, position)
                    match = None
                else:
                    match = self.TAG_MARKER.search(chunk, position)
                    ending = match.start() if match else -1
                if ending < 0:
                    self.count(len(chunk) - position)
                    return
                self.count(ending - position + 1)
                marker = chunk[ending:ending + 1]
                position = ending + 1
                if self.quote is not None:
                    self.quote = None
                elif marker == b">":
                    self.mode = "text"
                else:
                    self.quote = marker
            elif self.mode == "entity":
                ending = chunk.find(b";", position)
                if ending < 0:
                    self.count(len(chunk) - position)
                    return
                self.count(ending - position + 1)
                position = ending + 1
                self.mode = "text"
            else:
                delimiter = {"comment": b"-->", "cdata": b"]]>", "pi": b"?>"}[self.mode]
                combined = self.tail + chunk[position:]
                ending = combined.find(delimiter)
                consumed = len(chunk) - position if ending < 0 else ending + len(delimiter) - len(self.tail)
                if self.mode != "cdata":
                    self.count(consumed)
                if ending < 0:
                    self.tail = combined[-(len(delimiter) - 1):]
                    return
                position += consumed
                self.mode = "text"
                self.tail = b""


class Projector(ContentHandler, EntityResolver):
    def __init__(self, output, max_output_bytes):
        super().__init__()
        self.output = output
        self.max_output_bytes = max_output_bytes
        self.output_bytes = 0
        self.jobs = 0
        self.stack = []
        self.current = None
        self.capture = None
        self.parts = []
        self.field_bytes = 0
        self.publisher = None
        self.completed = False

    def resolveEntity(self, public_id, system_id):
        raise ValueError("External XML entities are prohibited")

    def startDTD(self, name, public_id, system_id):
        raise ValueError("DOCTYPE and XML entity declarations are prohibited")

    def endDTD(self):
        pass

    def startCDATA(self):
        pass

    def endCDATA(self):
        pass

    def comment(self, text):
        pass

    def startElement(self, name, attrs):
        if not self.stack and (name != "source" or self.completed):
            raise ValueError("Expected one complete Workable source root")
        if self.capture is not None:
            raise ValueError("Nested elements in a metadata field are unsupported")
        if name == "job" and self.stack != ["source"]:
            raise ValueError("Unsupported job nesting; postings must be direct children of source")
        self.stack.append(name)
        if len(self.stack) > MAX_DEPTH:
            raise ValueError("XML nesting exceeds budget")
        if self.stack == ["source", "job"]:
            if self.jobs >= MAX_JOBS:
                raise ValueError("Posting count exceeds budget")
            self.current = {}
        elif self.stack == ["source", "publisher"]:
            if self.publisher is not None:
                raise ValueError("Duplicate publisher")
            self.capture = "publisher"
        elif len(self.stack) == 3 and self.stack[:2] == ["source", "job"] and name in FIELDS:
            if name in self.current:
                raise ValueError("Duplicate metadata field")
            self.capture = name
        if self.capture is not None:
            self.parts = []
            self.field_bytes = 0

    def characters(self, content):
        if self.capture is not None:
            self.field_bytes += len(content.encode("utf-8"))
            if self.field_bytes > MAX_FIELD_BYTES:
                raise ValueError("Metadata field exceeds byte budget")
            self.parts.append(content)
        # Description and other non-projected text is deliberately discarded.

    def endElement(self, name):
        if self.capture is not None:
            value = "".join(self.parts).strip()
            if self.capture == "publisher":
                if value != "Workable":
                    raise ValueError("Unexpected publisher")
                self.publisher = value
            else:
                self.current[self.capture] = value
            self.capture = None
            self.parts = []
        if self.stack == ["source", "job"]:
            job = self.current
            if any(not job.get(field) for field in REQUIRED):
                raise ValueError("Posting is missing required metadata")
            normalized = {
                "referenceNumber": job["referencenumber"], "title": job["title"],
                "url": job["url"], "company": job["company"],
                "city": job.get("city") or None, "state": job.get("state") or None,
                "country": job.get("country") or None,
                "remote": job.get("remote", "").lower() == "true",
                "jobType": job.get("jobtype") or None,
                "category": job.get("category") or None,
                "postedAt": job.get("date") or None,
            }
            encoded = (json.dumps(normalized, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
            self.output_bytes += len(encoded)
            if self.output_bytes > self.max_output_bytes:
                raise ValueError("Projected metadata exceeds byte budget")
            self.output.write(encoded)
            self.jobs += 1
            self.current = None
        if self.stack == ["source"]:
            self.completed = True
        self.stack.pop()


def project_file(input_path, output_path, max_input_bytes=MAX_INPUT_BYTES,
                 max_output_bytes=MAX_OUTPUT_BYTES, timeout_seconds=MAX_SECONDS):
    if not 0 < max_input_bytes <= MAX_INPUT_BYTES or not 0 < max_output_bytes <= MAX_OUTPUT_BYTES:
        raise ValueError("Byte budgets must be positive and within hard ceilings")
    if not 0 < timeout_seconds <= MAX_SECONDS:
        raise ValueError("Time budget must be positive and within hard ceiling")
    input_path, output_path = Path(input_path), Path(output_path)
    if input_path.resolve() == output_path.resolve():
        raise ValueError("Input and projection paths must differ")
    if input_path.stat().st_size > max_input_bytes:
        raise ValueError("XML input exceeds byte budget")
    deadline = time.monotonic() + timeout_seconds
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="wb", dir=output_path.parent, prefix="workable-project-", delete=False) as output:
            temporary = Path(output.name)
            handler = Projector(output, max_output_bytes)
            parser = xml.sax.make_parser()
            parser.setFeature(feature_external_ges, False)
            parser.setFeature(feature_external_pes, False)
            parser.setContentHandler(handler)
            parser.setEntityResolver(handler)
            parser.setProperty(property_lexical_handler, handler)
            lexical_guard = LexicalBudgetGuard()
            input_bytes = 0
            with input_path.open("rb") as source:
                while chunk := source.read(64 * 1024):
                    if time.monotonic() >= deadline:
                        raise ValueError("XML projection timed out")
                    input_bytes += len(chunk)
                    if input_bytes > max_input_bytes:
                        raise ValueError("XML input exceeds byte budget")
                    lexical_guard.feed(chunk)
                    parser.feed(chunk)
            parser.close()  # Rejects a truncated document, including its final chunk.
            if time.monotonic() >= deadline:
                raise ValueError("XML projection timed out")
            if not handler.completed or handler.stack or handler.publisher != "Workable" or not handler.jobs:
                raise ValueError("Expected a complete nonempty Workable feed")
        os.replace(temporary, output_path)
        return {"inputBytes": input_bytes, "projectedBytes": handler.output_bytes, "jobs": handler.jobs}
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--input", required=True)
    args.add_argument("--output", required=True)
    args.add_argument("--max-input-bytes", type=int, default=MAX_INPUT_BYTES)
    args.add_argument("--max-output-bytes", type=int, default=MAX_OUTPUT_BYTES)
    args.add_argument("--timeout-seconds", type=float, default=MAX_SECONDS)
    options = args.parse_args()
    try:
        result = project_file(options.input, options.output, options.max_input_bytes,
                              options.max_output_bytes, options.timeout_seconds)
        print(json.dumps(result))
    except (OSError, ValueError, xml.sax.SAXException) as error:
        args.exit(1, f"Workable projection failed: {error}\n")


if __name__ == "__main__":
    main()
