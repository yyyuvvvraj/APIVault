#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "build-high-priority-review-queue.py"
spec = importlib.util.spec_from_file_location("review_queue", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReviewQueueTests(unittest.TestCase):
    def sample(self):
        rid = "review-123"
        import hashlib
        slug = "sample-" + hashlib.sha256(rid.encode()).hexdigest()[:8]
        return rid, slug

    def test_preserves_candidates_and_never_marks_official(self):
        rid, slug = self.sample()
        manifest = {"apis": [{"slug": slug, "name": "Sample API", "homepageUrl": "https://sample.test/", "documentationUrl": "https://sample.test/docs", "categories": ["developer-tools"]}]}
        research = {"records": [{"reviewId": rid, "research": {
            "httpStatus": 200, "resolvedUrl": "https://sample.test/", "title": "Sample API",
            "candidateLinks": [{"kind": "PRICING", "url": "https://sample.test/pricing"}],
            "followUpPages": [{"kind": "API_DOCUMENTATION", "url": "https://sample.test/docs", "fetchStatus": "FETCHED", "httpStatus": 200, "title": "API Reference"}]
        }}]}
        validation = {"generatedAt": "2026-01-01T00:00:00Z", "results": [{"slug": slug, "checks": [
            {"url": "https://sample.test/", "finalUrl": "https://sample.test/", "reachable": True, "statusCode": 200},
            {"url": "https://sample.test/docs", "finalUrl": "https://sample.test/docs", "reachable": True, "statusCode": 200}
        ]}]}
        result = module.build_queue(manifest, research, validation)
        self.assertEqual(result["candidateTotal"], 1)
        entry = result["entries"][0]
        self.assertEqual(entry["reviewPriority"], "REVIEW_WITH_CLAIM_EVIDENCE")
        self.assertEqual(entry["officialHomepage"], "UNCONFIRMED")
        self.assertEqual(entry["verificationStatus"], "UNVERIFIED")
        self.assertEqual(entry["publicationStatus"], "NOT_PUBLISHED")

    def test_failed_live_check_is_recheck_priority(self):
        rid, slug = self.sample()
        manifest = {"apis": [{"slug": slug, "name": "Sample", "homepageUrl": "https://sample.test/", "documentationUrl": "https://sample.test/docs"}]}
        research = {"records": [{"reviewId": rid, "research": {}}]}
        validation = {"results": [{"slug": slug, "checks": [{"reachable": False, "statusCode": 0, "finalUrl": ""}]}]}
        result = module.build_queue(manifest, research, validation)
        self.assertEqual(result["entries"][0]["reviewPriority"], "RECHECK_LIVE_URLS")

    def test_rejects_missing_validation_result(self):
        rid, slug = self.sample()
        with self.assertRaises(ValueError):
            module.build_queue(
                {"apis": [{"slug": slug}]},
                {"records": [{"reviewId": rid, "research": {}}]},
                {"results": []}
            )

if __name__ == "__main__":
    unittest.main()
