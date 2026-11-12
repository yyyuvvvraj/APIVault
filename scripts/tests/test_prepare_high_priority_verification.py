import json
import sys
import tempfile
import unittest
from pathlib import Path

import importlib.util

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "prepare-high-priority-verification.py"
SPEC = importlib.util.spec_from_file_location("prepare_high_priority_verification", SCRIPT_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)
build_manifest = MODULE.build_manifest
candidate_for = MODULE.candidate_for


def lead():
    return {
        "reviewId": "abc123",
        "name": "Example API",
        "description": "A developer API for example data and endpoints.",
        "originalUrl": "https://example.test",
        "canonicalUrl": "https://example.test",
        "priority": "HIGH",
        "suggestedCategory": "Developer Tools",
    }


def record():
    return {
        "reviewId": "abc123",
        "name": "Example API",
        "priority": "HIGH",
        "canonicalUrl": "https://example.test",
        "research": {
            "fetchStatus": "FETCHED",
            "httpStatus": 200,
            "resolvedUrl": "https://example.test/",
            "followUpPages": [{
                "kind": "API_DOCUMENTATION",
                "url": "https://example.test/docs",
                "fetchStatus": "FETCHED",
                "httpStatus": 200,
                "resolvedUrl": "https://example.test/docs",
                "contentType": "text/html",
                "title": "Example API Reference",
                "description": "REST API endpoints and request reference.",
            }],
        },
    }


class CandidatePreparationTests(unittest.TestCase):
    def test_emits_only_pending_unofficial_candidate(self):
        api, reason = candidate_for(lead(), record())
        self.assertEqual(reason, "")
        self.assertEqual(api["verificationStatus"], "PENDING_REVIEW")
        self.assertFalse(api["sources"][0]["isOfficial"])
        self.assertFalse(api["sources"][1]["isOfficial"])
        self.assertEqual(api["authMethods"][0]["method"], "UNKNOWN")
        self.assertEqual(api["categories"], ["developer-tools"])

    def test_accepts_same_provider_subdomain_documentation(self):
        item = record()
        item["research"]["followUpPages"][0]["url"] = "https://docs.example.test/api-reference"
        item["research"]["followUpPages"][0]["resolvedUrl"] = "https://docs.example.test/api-reference"
        api, reason = candidate_for(lead(), item)
        self.assertEqual(reason, "")
        self.assertEqual(api["documentationUrl"], "https://docs.example.test/api-reference")

    def test_rejects_failed_homepage(self):
        item = record()
        item["research"]["httpStatus"] = 503
        api, reason = candidate_for(lead(), item)
        self.assertIsNone(api)
        self.assertEqual(reason, "homepage_fetch_not_successful")

    def test_rejects_cross_host_documentation(self):
        item = record()
        item["research"]["followUpPages"][0]["url"] = "https://docs.other.test/api"
        item["research"]["followUpPages"][0]["resolvedUrl"] = "https://docs.other.test/api"
        api, reason = candidate_for(lead(), item)
        self.assertIsNone(api)
        self.assertEqual(reason, "no_successful_same_host_api_documentation_page")

    def test_rejects_non_api_metadata(self):
        item = record()
        item["research"]["followUpPages"][0]["title"] = "Company news"
        item["research"]["followUpPages"][0]["description"] = "Latest announcements"
        api, reason = candidate_for(lead(), item)
        self.assertIsNone(api)
        self.assertEqual(reason, "no_successful_same_host_api_documentation_page")

    def test_requires_complete_unique_queue_and_research(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            queue_path = root / "queue.json"
            research_dir = root / "research"
            research_dir.mkdir()
            queue_path.write_text(json.dumps({
                "sourceRevision": "a" * 40,
                "candidates": [lead()],
            }), encoding="utf-8")
            (research_dir / "research-0.json").write_text(json.dumps({
                "leadCount": 1,
                "records": [record()],
            }), encoding="utf-8")
            manifest, report = build_manifest(queue_path, research_dir, 1)
            self.assertEqual(len(manifest["apis"]), 1)
            self.assertEqual(report["candidateCount"], 1)
            self.assertIn("REPORT_ONLY", report["publicationPolicy"])

            with self.assertRaises(ValueError):
                build_manifest(queue_path, research_dir, 2)


if __name__ == "__main__":
    unittest.main()
