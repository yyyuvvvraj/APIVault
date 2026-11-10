import importlib.util, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
SCRIPT = Path(__file__).resolve().parents[1] / "catalogue-high-priority-research.py"
spec = importlib.util.spec_from_file_location("research", SCRIPT)
research = importlib.util.module_from_spec(spec); spec.loader.exec_module(research)

class PipelineTests(unittest.TestCase):
    def test_all_priorities_deduplicate_hosts_and_preserve_human_gate(self):
        with tempfile.TemporaryDirectory() as tmp:
            source, target = Path(tmp)/"queue.json", Path(tmp)/"out.json"
            source.write_text(json.dumps({"candidates":[
                {"reviewId":"a","name":"A","priority":"HIGH","originalUrl":"https://example.com/a","canonicalUrl":"https://example.com/a"},
                {"reviewId":"b","name":"B","priority":"HIGH","originalUrl":"https://example.com/b","canonicalUrl":"https://example.com/b"},
                {"reviewId":"c","name":"C","priority":"NORMAL","originalUrl":"https://other.example/","canonicalUrl":"https://other.example/"},
                {"reviewId":"d","name":"D","priority":"LOW","originalUrl":"https://third.example/","canonicalUrl":"https://third.example/"}]}))
            fake = {"fetchStatus":"FETCHED","candidateLinks":[],"observedAt":"2026-01-01T00:00:00Z"}
            with patch.object(research, "fetch_page", return_value=fake) as fetch:
                summary = research.run([str(source)], str(target), 2)
            report = json.loads(target.read_text())
            self.assertEqual(summary["leadCount"], 4)
            self.assertEqual(summary["uniqueHostnames"], 3)
            self.assertEqual(fetch.call_count, 3)
            self.assertEqual({x["priority"] for x in report["records"]}, {"HIGH", "NORMAL", "LOW"})
            self.assertTrue(all(x["disposition"] == "HUMAN_REVIEW_REQUIRED" for x in report["records"]))
            self.assertTrue(all(x["importEligible"] is False and x["verificationStatus"] == "UNVERIFIED" for x in report["records"]))
    def test_rejects_non_http_and_private_urls(self):
        for url in ("file:///etc/passwd", "http://127.0.0.1/", "http://localhost/"):
            with self.subTest(url=url), self.assertRaises(ValueError): research.validate_public_url(url)

if __name__ == "__main__": unittest.main()
