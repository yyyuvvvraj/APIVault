package discovery

import (
	"strings"
	"testing"
)

const testRevision = "88706670ac0ffaad7bf3c6307747e2515f638bed"

func TestParseMarkdownExtractsDiscoveryLeads(t *testing.T) {
	input := "# Animals\n| API | Description |\n| --- | --- |\n| [Pet Store](https://pets.example/api) | Find pets |\n"
	got, err := ParseMarkdown(input, "https://github.com/public-apis/public-apis", testRevision)
	if err != nil { t.Fatal(err) }
	if len(got) != 1 { t.Fatalf("got %d candidates, want 1", len(got)) }
	if got[0].Name != "Pet Store" || got[0].Category != "Animals" || got[0].Status != "DISCOVERY_ONLY" {
		t.Fatalf("unexpected candidate: %#v", got[0])
	}
	if got[0].SourceRevision != testRevision { t.Fatalf("revision not preserved: %s", got[0].SourceRevision) }
}

func TestParseMarkdownDeduplicatesHostAndPath(t *testing.T) {
	input := "# Tools\n| [One](https://example.com/api/) | first |\n| [Two](https://EXAMPLE.com/api) | second |\n"
	got, err := ParseMarkdown(input, "https://github.com/public-apis/public-apis", testRevision)
	if err != nil { t.Fatal(err) }
	if len(got) != 1 { t.Fatalf("got %d candidates, want 1", len(got)) }
}

func TestParseMarkdownRejectsInvalidRevisionAndURLs(t *testing.T) {
	_, err := ParseMarkdown("", "https://github.com/public-apis/public-apis", "abc")
	if err == nil || !strings.Contains(err.Error(), "40-character") { t.Fatalf("expected revision error, got %v", err) }
	input := "# Bad\n| [Bad](http://example.com) | description |\n"
	_, err = ParseMarkdown(input, "https://github.com/public-apis/public-apis", testRevision)
	if err == nil { t.Fatal("expected insecure URL error") }
}

func TestParseMarkdownRejectsCredentialURLs(t *testing.T) {
	input := "# Bad\n| [Bad](https://user:pass@example.com/api) | description |\n"
	_, err := ParseMarkdown(input, "https://github.com/public-apis/public-apis", testRevision)
	if err == nil { t.Fatal("expected credential URL error") }
}
