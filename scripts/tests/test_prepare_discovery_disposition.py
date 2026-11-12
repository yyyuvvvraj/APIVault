import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "prepare-discovery-disposition.py"
SPEC = importlib.util.spec_from_file_location("prepare_discovery_disposition", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class PrepareDiscoveryDispositionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.research_dir = self.root / "research"
        self.research_dir.mkdir()
        self.queue_path = self.root / "queue.json"

    def tearDown(self):
        self.temp.cleanup()

    def write_inputs(self, candidates, reports):
        self.queue_path.write_text(json.dumps({
            "sourceRevision": "a" * 40,
            "sourceTotal": len(candidates),
            "candidates": candidates,
        }), encoding="utf-8")
        for name, report in reports.items():
            (self.research_dir / name).write_text(json.dumps(report), encoding="utf-8")

    def candidate(self, review_id, name="Example API"):
        return {
            "reviewId": review_id,
            "name": name,
            "originalUrl": "https://example.com/",
            "canonicalUrl": "https://example.com/",
            "sourceCategory": "Developer Tools",
            "suggestedCategory": "Developer Tools",
            "priority": "HIGH",
        }

    def research_record(self, review_id, docs=True):
        links = []
        if docs:
            links.append({
                "kind": "API_DOCUMENTATION",
                "url": "https://example.com/docs",
                "linkText": "API documentation",
            })
        return {
            "reviewId": review_id,
            "name": "Example API",
            "priority": "HIGH",
            "sourceUrl": "https://example.com/",
            "canonicalUrl": "https://example.com/",
            "hostname": "example.com",
            "research": {
                "fetchStatus": "FETCHED",
                "httpStatus": 200,
                "resolvedUrl": "https://example.com/",
                "title": "Example API",
                "description": "Official API information.",
                "candidateLinks": links,
            },
        }

    def test_complete_evidence_is_ready_for_maintainer_review_only(self):
        candidates = [self.candidate("lead-1")]
        records = [self.research_record("lead-1")]
        self.write_inputs(candidates, {"research-0.json": {"leadCount": 1, "records": records}})

        report = MODULE.build_report(str(self.queue_path), str(self.research_dir), 1)

        self.assertEqual(report["processed"], 1)
        record = report["records"][0]
        self.assertEqual(record["disposition"], "READY_FOR_MAINTAINER_REVIEW")
        self.assertEqual(record["verificationStatus"], "UNVERIFIED")
        self.assertEqual(record["publicationStatus"], "NOT_PUBLISHED")
        self.assertFalse(record["importEligible"])
        self.assertTrue(record["humanReviewRequired"])

    def test_missing_documentation_stays_review_required(self):
        candidates = [self.candidate("lead-2")]
        records = [self.research_record("lead-2", docs=False)]
        self.write_inputs(candidates, {"research-0.json": {"leadCount": 1, "records": records}})

        report = MODULE.build_report(str(self.queue_path), str(self.research_dir), 1)

        self.assertEqual(report["records"][0]["disposition"], "REVIEW_REQUIRED")
        self.assertTrue(report["records"][0]["evidenceIssues"])

    def test_research_queue_id_mismatch_fails_closed(self):
        candidates = [self.candidate("lead-3")]
        records = [self.research_record("different-lead")]
        self.write_inputs(candidates, {"research-0.json": {"leadCount": 1, "records": records}})

        with self.assertRaisesRegex(ValueError, "ID mismatch"):
            MODULE.build_report(str(self.queue_path), str(self.research_dir), 1)

    def test_duplicate_research_ids_fail_closed(self):
        candidates = [self.candidate("lead-4")]
        records = [self.research_record("lead-4"), self.research_record("lead-4")]
        self.write_inputs(candidates, {"research-0.json": {"leadCount": 2, "records": records}})

        with self.assertRaisesRegex(ValueError, "Duplicate research reviewId"):
            MODULE.build_report(str(self.queue_path), str(self.research_dir), 1)


if __name__ == "__main__":
    unittest.main()
