import unittest

from validate_review_import import validate


def valid_manifest():
    return {
        "dataset": {
            "name": "test", "version": "revision", "license": "NOASSERTION",
            "attribution": "review only", "sourceUrl": "https://example.com/source"
        },
        "apis": [{
            "slug": "example-api", "name": "Example API", "summary": "An example API",
            "provider": {"slug": "example-provider", "name": "Example"},
            "homepageUrl": "https://example.com/",
            "documentationUrl": "https://example.com/docs",
            "status": "ACTIVE", "verificationStatus": "PENDING_REVIEW",
            "featured": False, "categories": ["developer-tools"],
            "authMethods": [{"method": "UNKNOWN"}],
            "sources": [
                {"kind": "OFFICIAL_HOMEPAGE", "url": "https://example.com/", "isOfficial": False},
                {"kind": "DOCUMENTATION", "url": "https://example.com/docs", "isOfficial": False},
            ],
        }],
    }


class ReviewImportValidationTests(unittest.TestCase):
    def test_accepts_unverified_review_only_manifest(self):
        self.assertEqual(validate(valid_manifest()), [])

    def test_rejects_official_source_assertions(self):
        manifest = valid_manifest()
        manifest["apis"][0]["sources"][0]["isOfficial"] = True
        self.assertTrue(any("isOfficial must be false" in item for item in validate(manifest)))

    def test_rejects_verified_or_featured_records(self):
        manifest = valid_manifest()
        manifest["apis"][0]["verificationStatus"] = "VERIFIED"
        manifest["apis"][0]["featured"] = True
        errors = validate(manifest)
        self.assertTrue(any("PENDING_REVIEW" in item for item in errors))
        self.assertTrue(any("cannot be featured" in item for item in errors))

    def test_rejects_duplicate_slugs_and_provider_hosts(self):
        manifest = valid_manifest()
        duplicate = dict(manifest["apis"][0])
        manifest["apis"].append(duplicate)
        errors = validate(manifest)
        self.assertTrue(any("slug is duplicated" in item for item in errors))
        self.assertTrue(any("duplicates provider homepage host" in item for item in errors))

    def test_rejects_non_https_documentation(self):
        manifest = valid_manifest()
        manifest["apis"][0]["documentationUrl"] = "http://example.com/docs"
        self.assertTrue(any("HTTPS homepage and documentation" in item for item in validate(manifest)))


if __name__ == "__main__":
    unittest.main()
