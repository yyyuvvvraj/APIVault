package discovery

import "testing"

const testRevision = "0123456789abcdef0123456789abcdef01234567"

func TestParseMarkdownExtractsOnlyDiscoveryLeads(t *testing.T) {
	input := `# Directory

### Animals API
| API | Description | Auth |
|:---|:---|:---|
| [Dog CEO](https://dog.ceo/dog-api/) | Random dog pictures | No |
| [Bad URL](http://insecure.example/api) | Insecure listing | No |
| [No Description](https://example.org) | | No |
| [Dog CEO duplicate](https://dog.ceo/dog-api/) | Duplicate listing | No |

### Books API
| API | Description | Auth |
|:---|:---|:---|
| [Open Library](https://openlibrary.org/developers/api) | Books and metadata | No |
`
	got, err := ParseMarkdown(input, "https://github.com/public-apis/public-apis", testRevision)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("got %d candidates, want 2: %#v", len(got), got)
	}
	if got[0].Name != "Dog CEO" || got[0].UpstreamCategory != "Animals" {
		t.Fatalf("unexpected first candidate: %#v", got[0])
	}
	if got[0].ReviewStatus != "DISCOVERY_ONLY" || got[0].DirectoryRevision != testRevision {
		t.Fatalf("candidate lacks discovery provenance: %#v", got[0])
	}
	if got[1].UpstreamCategory != "Books" {
		t.Fatalf("category = %q, want Books", got[1].UpstreamCategory)
	}
}

func TestParseMarkdownRequiresPinnedProvenance(t *testing.T) {
	if _, err := ParseMarkdown("| [A](https://a.example) | API |", "https://github.com/public-apis/public-apis", ""); err == nil {
		t.Fatal("expected missing immutable revision to fail")
	}
	if _, err := ParseMarkdown("| [A](https://a.example) | API |", "https://github.com/public-apis/public-apis", "0123456789abcdef"); err == nil {
		t.Fatal("expected abbreviated revision to fail")
	}
	if _, err := ParseMarkdown("| [A](https://a.example) | API |", "http://github.com/public-apis/public-apis", testRevision); err == nil {
		t.Fatal("expected non-HTTPS directory URL to fail")
	}
}

func TestParseMarkdownRejectsCredentialURLs(t *testing.T) {
	input := `### Test API
| API | Description |
|---|---|
| [Unsafe](https://user:pass@example.org/api) | Not a safe source |
`
	got, err := ParseMarkdown(input, "https://github.com/public-apis/public-apis", testRevision)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 0 {
		t.Fatalf("got unsafe candidates: %#v", got)
	}
}
