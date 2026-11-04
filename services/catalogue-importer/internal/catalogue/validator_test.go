package catalogue

import (
	"context"
	"net"
	"testing"
)

func TestCanonicalHomepage(t *testing.T) {
	got, err := canonicalHomepage("https://www.Example.com/docs/?utm_source=x#top")
	if err != nil {
		t.Fatal(err)
	}
	if got != "example.com/docs" {
		t.Fatalf("canonical homepage = %q", got)
	}
}

func TestIsPublicIP(t *testing.T) {
	cases := []struct {
		value string
		want  bool
	}{
		{"8.8.8.8", true},
		{"127.0.0.1", false},
		{"10.0.0.1", false},
		{"169.254.1.1", false},
		{"::1", false},
		{"2001:4860:4860::8888", true},
	}
	for _, tc := range cases {
		t.Run(tc.value, func(t *testing.T) {
			if got := isPublicIP(net.ParseIP(tc.value)); got != tc.want {
				t.Fatalf("isPublicIP(%s) = %v, want %v", tc.value, got, tc.want)
			}
		})
	}
}

func TestDialPublicContextRejectsLoopback(t *testing.T) {
	_, err := dialPublicContext(context.Background(), "tcp", "127.0.0.1:443")
	if err == nil {
		t.Fatal("expected loopback destination to be rejected")
	}
}

func TestApplyCatalogueConflictChecks(t *testing.T) {
	report := ValidationReport{Results: []APIValidation{
		{Slug: "weather-api", Name: "Weather API", Provider: "Acme", HomepageURL: "https://www.acme.example/weather/", Verdict: "VALIDATED_CANDIDATE"},
		{Slug: "weather-api-copy", Name: "  Weather   API ", Provider: "ACME", HomepageURL: "https://acme.example/weather?ref=directory", Verdict: "VALIDATED_CANDIDATE"},
		{Slug: "maps-api", Name: "Maps API", Provider: "Other", HomepageURL: "https://acme.example/weather", Verdict: "VALIDATED_CANDIDATE"},
	}}
	applyCatalogueConflictChecks(&report)

	if len(report.Conflicts) != 2 {
		t.Fatalf("got %d conflicts, want 2: %#v", len(report.Conflicts), report.Conflicts)
	}
	if report.Results[1].Verdict != "REVIEW_REQUIRED" || report.Results[1].DuplicateOf != "weather-api" {
		t.Fatalf("same-provider duplicate was not routed to review: %#v", report.Results[1])
	}
	if report.Results[2].Verdict != "REVIEW_REQUIRED" {
		t.Fatalf("cross-provider homepage collision was not routed to review: %#v", report.Results[2])
	}
	if report.ValidatedCandidates != 1 || report.ReviewRequired != 2 || report.Rejected != 0 {
		t.Fatalf("unexpected report counts: validated=%d review=%d rejected=%d", report.ValidatedCandidates, report.ReviewRequired, report.Rejected)
	}
}

func TestApplyCatalogueConflictChecksDoesNotFlagSharedHomepageWithinProvider(t *testing.T) {
	report := ValidationReport{Results: []APIValidation{
		{Slug: "product-one", Name: "Product One", Provider: "Acme", HomepageURL: "https://acme.example", Verdict: "VALIDATED_CANDIDATE"},
		{Slug: "product-two", Name: "Product Two", Provider: "Acme", HomepageURL: "https://www.acme.example/", Verdict: "VALIDATED_CANDIDATE"},
	}}
	applyCatalogueConflictChecks(&report)
	if len(report.Conflicts) != 0 {
		t.Fatalf("shared provider homepage should not create a cross-provider conflict: %#v", report.Conflicts)
	}
	if report.ValidatedCandidates != 2 {
		t.Fatalf("validated count = %d, want 2", report.ValidatedCandidates)
	}
}
