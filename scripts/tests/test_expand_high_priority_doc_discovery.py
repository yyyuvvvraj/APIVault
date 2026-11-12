import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "expand-high-priority-doc-discovery.py"
SPEC = importlib.util.spec_from_file_location("expand_high_priority_doc_discovery", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def fetched(url, title="Example API Reference", description="REST API endpoints reference.", resolved=None):
    return {
        "requestedUrl": url,
        "fetchStatus": "FETCHED",
        "httpStatus": 200,
        "resolvedUrl": resolved or url,
        "contentType": "text/html; charset=utf-8",
        "title": title,
        "description": description,
        "observedAt": "2026-11-12T00:00:00Z",
    }


class DocumentationExpansionTests(unittest.TestCase):
    def test_stops_after_first_matching_api_docs_path(self):
        calls = []
        def fake_fetch(url, timeout):
            calls.append(url)
            if url.endswith("/api/docs"):
                return fetched(url)
            return {"requestedUrl": url, "fetchStatus": "FETCH_FAILED", "httpStatus": 404}
        result = MODULE.probe_host("https://example.test", fake_fetch)
        self.assertEqual(len(result["pages"]), 1)
        self.assertEqual(result["pages"][0]["url"], "https://example.test/api/docs")
        self.assertEqual(result["attempted"], 2)
        self.assertEqual(len(calls), 2)

    def test_rejects_cross_provider_redirect(self):
        def fake_fetch(url, timeout):
            if url.endswith("/docs"):
                return fetched(url, resolved="https://unrelated.test/docs")
            return {"requestedUrl": url, "fetchStatus": "FETCH_FAILED", "httpStatus": 404}
        result = MODULE.probe_host("https://example.test", fake_fetch)
        self.assertEqual(result["pages"], [])

    def test_rejects_generic_page_without_api_signals(self):
        def fake_fetch(url, timeout):
            if url.endswith("/docs"):
                return fetched(url, title="Company documentation", description="General product help.")
            return {"requestedUrl": url, "fetchStatus": "FETCH_FAILED", "httpStatus": 404}
        result = MODULE.probe_host("https://example.test", fake_fetch)
        self.assertEqual(result["pages"], [])

    def test_expands_complete_queue_and_preserves_unverified_status(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            research_dir = root / "research"
            research_dir.mkdir()
            queue = root / "queue.json"
            output = root / "expanded.json"
            lead = {
                "reviewId": "lead-1",
                "name": "Example API",
                "canonicalUrl": "https://example.test",
                "priority": "HIGH",
            }
            queue.write_text(json.dumps({"candidates": [lead]}), encoding="utf-8")
            record = {
                "reviewId": "lead-1",
                "canonicalUrl": "https://example.test",
                "research": {
                    "fetchStatus": "FETCHED",
                    "httpStatus": 200,
                    "resolvedUrl": "https://example.test/",
                    "followUpPages": [],
                },
                "verificationStatus": "UNVERIFIED",
                "publicationStatus": "NOT_PUBLISHED",
            }
            (research_dir / "research-0.json").write_text(json.dumps({
                "leadCount": 1,
                "records": [record],
            }), encoding="utf-8")
            def fake_fetch(url, timeout):
                if url.endswith("/docs"):
                    return fetched(url)
                return {"requestedUrl": url, "fetchStatus": "FETCH_FAILED", "httpStatus": 404}
            summary = MODULE.expand(queue, research_dir, output, 1, fetch_page=fake_fetch)
            result = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["hostsWithDocumentationFound"], 1)
            self.assertEqual(summary["newDocumentationEvidenceRecords"], 1)
            self.assertEqual(result["records"][0]["verificationStatus"], "UNVERIFIED")
            self.assertEqual(result["records"][0]["publicationStatus"], "NOT_PUBLISHED")
            self.assertEqual(result["records"][0]["research"]["followUpPages"][0]["evidenceStatus"], "UNVERIFIED_CANDIDATE")

    def test_rejects_incomplete_research_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            research_dir = root / "research"
            research_dir.mkdir()
            queue = root / "queue.json"
            queue.write_text(json.dumps({"candidates": [{
                "reviewId": "lead-1", "canonicalUrl": "https://example.test"
            }]}), encoding="utf-8")
            with self.assertRaises(ValueError):
                MODULE.expand(queue, research_dir, root / "expanded.json", 1)


if __name__ == "__main__":
    unittest.main()
