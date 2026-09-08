"""Offline adversarial coverage for bounded Workable metadata projection."""
import json
from pathlib import Path
import sys
import tempfile
import tracemalloc
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
from workable_xml_project import project_file, MAX_FIELD_BYTES, MAX_DEPTH, LexicalBudgetGuard, MAX_MARKUP_BYTES

PREFIX = b'<source><publisher>Workable</publisher><job><referencenumber>A1</referencenumber><title>Writer</title><company>Acme</company><url>https://apply.workable.com/acme/j/A1/</url><remote>true</remote>'
SUFFIX = b'</job></source>'


class WorkableProjectionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="va-workable-python-test-")
        self.root = Path(self.directory.name)
        self.source = self.root / "source.xml"
        self.output = self.root / "projected.jsonl"

    def tearDown(self):
        self.directory.cleanup()

    def test_large_description_is_discarded_with_bounded_memory(self):
        with self.source.open("wb") as stream:
            stream.write(PREFIX + b'<description><![CDATA[')
            for _ in range(16):
                stream.write(b"large private description " * 40_000)
            stream.write(b']]></description>' + SUFFIX)
        tracemalloc.start()
        result = project_file(self.source, self.output)
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        self.assertGreater(result["inputBytes"], 15 * 1024 * 1024)
        self.assertLess(peak, 4 * 1024 * 1024)
        self.assertLess(result["projectedBytes"], 1024)
        self.assertNotIn("description", self.output.read_text())
        self.assertEqual(json.loads(self.output.read_text())["title"], "Writer")

    def test_truncation_root_schema_and_entities_fail_without_replacing_output(self):
        bad_documents = [
            PREFIX, b'<html>Maintenance</html>',
            PREFIX + b'</job>',
            (PREFIX + SUFFIX).replace(b'<title>Writer</title>', b''),
            (PREFIX + SUFFIX).replace(b'Workable', b'OtherProvider'),
            b'<!DOCTYPE source [<!ENTITY expansion "payload">]>' + PREFIX + SUFFIX,
            b'<!DOCTYPE source SYSTEM "file:///etc/passwd">' + PREFIX + SUFFIX,
            b'<!DOCTYPE source [<!ENTITY external SYSTEM "https://example.com/">]>' + PREFIX + SUFFIX,
        ]
        for document in bad_documents:
            with self.subTest(document=document[:70]):
                self.source.write_bytes(document)
                self.output.write_text("previous projection")
                with self.assertRaises(Exception):
                    project_file(self.source, self.output)
                self.assertEqual(self.output.read_text(), "previous projection")
                self.assertEqual(sorted(path.name for path in self.root.iterdir()), ["projected.jsonl", "source.xml"])

    def test_input_output_field_and_depth_limits(self):
        self.source.write_bytes(PREFIX + SUFFIX)
        with self.assertRaisesRegex(ValueError, "input exceeds"):
            project_file(self.source, self.output, max_input_bytes=10)
        with self.assertRaisesRegex(ValueError, "metadata exceeds"):
            project_file(self.source, self.output, max_output_bytes=10)
        self.source.write_bytes((PREFIX + SUFFIX).replace(b'Writer', b'x' * (MAX_FIELD_BYTES + 1)))
        with self.assertRaisesRegex(ValueError, "field exceeds"):
            project_file(self.source, self.output)
        self.source.write_bytes(PREFIX + b'<description>' + b'<x>' * MAX_DEPTH + b'</x>' * MAX_DEPTH + b'</description>' + SUFFIX)
        with self.assertRaisesRegex(ValueError, "nesting exceeds"):
            project_file(self.source, self.output)
        self.assertEqual([path.name for path in self.root.iterdir()], ["source.xml"])

    def test_timeout_and_input_output_alias_are_rejected(self):
        self.source.write_bytes(PREFIX + SUFFIX)
        with patch("workable_xml_project.time.monotonic", side_effect=[0, 2]):
            with self.assertRaisesRegex(ValueError, "timed out"):
                project_file(self.source, self.output, timeout_seconds=1)
        with self.assertRaisesRegex(ValueError, "must differ"):
            project_file(self.source, self.source)
        self.assertEqual([path.name for path in self.root.iterdir()], ["source.xml"])

    def test_documented_fields_match_normalized_shape_and_preserve_text(self):
        self.source.write_bytes((PREFIX + b'<city><![CDATA[Manila & Cebu]]></city><country>PH</country><jobtype>Full-time</jobtype><date>2026-09-08</date>' + SUFFIX)
                                .replace(b'Writer', b'Writer &amp; Editor'))
        project_file(self.source, self.output)
        posting = json.loads(self.output.read_text())
        self.assertEqual(posting["title"], "Writer & Editor")
        self.assertEqual(posting["city"], "Manila & Cebu")
        self.assertEqual(posting["country"], "PH")
        self.assertEqual(posting["postedAt"], "2026-09-08")
        self.assertTrue(posting["remote"])
        self.assertIsNone(posting["state"])

    def test_jobs_outside_the_documented_direct_child_path_are_rejected(self):
        for document in [
            PREFIX + b'<description><job>Nested</job></description>' + SUFFIX,
            PREFIX + b'</job><wrapper><job>Nested</job></wrapper></source>',
        ]:
            self.source.write_bytes(document)
            self.output.write_text("previous projection")
            with self.assertRaisesRegex(ValueError, "Unsupported job nesting"):
                project_file(self.source, self.output)
            self.assertEqual(self.output.read_text(), "previous projection")
            self.assertEqual(sorted(path.name for path in self.root.iterdir()), ["projected.jsonl", "source.xml"])

    def test_huge_attributes_comments_and_other_tokens_fail_before_sax_buffers_them(self):
        cases = [
            (b'<source note="', b'">' + PREFIX[len(b'<source>'):] + SUFFIX),
            (b'<!--', b'-->' + PREFIX + SUFFIX),
            (b'<?test ', b'?>' + PREFIX + SUFFIX),
            (PREFIX + b'<description>&', b';</description>' + SUFFIX),
        ]
        for prefix, suffix in cases:
            with self.subTest(prefix=prefix[:30]):
                with self.source.open("wb") as stream:
                    stream.write(prefix)
                    for _ in range(8):
                        stream.write(b"x" * (1024 * 1024))
                    stream.write(suffix)
                self.output.write_text("previous projection")
                tracemalloc.start()
                try:
                    with self.assertRaisesRegex(ValueError, "lexical token exceeds"):
                        project_file(self.source, self.output)
                    _, peak = tracemalloc.get_traced_memory()
                finally:
                    tracemalloc.stop()
                self.assertLess(peak, 4 * 1024 * 1024)
                self.assertEqual(self.output.read_text(), "previous projection")
                self.assertEqual(sorted(path.name for path in self.root.iterdir()), ["projected.jsonl", "source.xml"])

    def test_lexical_guard_handles_chunk_boundaries_and_literal_cdata_markup(self):
        document = (b'<?xml version="1.0"?><source a="value > value"><!-- fine -->'
                    b'<description><![CDATA[<job>not a posting</job><!DOCTYPE literal> &notentity;]]></description>'
                    b'<title>A &amp; B</title></source>')
        for size in (1, 2, 3, 7, 64):
            guard = LexicalBudgetGuard()
            for offset in range(0, len(document), size):
                guard.feed(document[offset:offset + size])
            self.assertEqual(guard.mode, "text")
        for prefix in (b'<source a="', b'<!--', b'<?test ', b'&'):
            guard = LexicalBudgetGuard()
            for character in prefix:
                guard.feed(bytes([character]))
            with self.assertRaisesRegex(ValueError, "lexical token exceeds"):
                for _ in range(MAX_MARKUP_BYTES // 1024 + 1):
                    guard.feed(b"x" * 1024)
        guard = LexicalBudgetGuard()
        with self.assertRaisesRegex(ValueError, "DOCTYPE"):
            for character in b'<!DOCTYPE source>':
                guard.feed(bytes([character]))
        with self.assertRaisesRegex(ValueError, "UTF-16/32"):
            LexicalBudgetGuard().feed('<source/>'.encode('utf-16'))


if __name__ == "__main__":
    unittest.main()
