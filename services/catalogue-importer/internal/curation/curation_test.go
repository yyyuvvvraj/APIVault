package curation

import (
	"testing"
	"time"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/evidence"
)

func validEvidencePack() evidence.Pack {
	now := time.Date(2026, 11, 10, 12, 0, 0, 0, time.UTC)
	return evidence.Pack{
		SchemaVersion: evidence.SchemaVersion,
		ReviewedAt:    now,
		Reviewer:      "maintainer@example.com",
		Submissions: []evidence.Submission{{
			ReviewID:            "review-123",
			ProviderName:        "Example Provider",
			ProviderDomains:     []string{"example.com"},
			OfficialHomepageURL: "https://example.com",
			DocumentationURL:    "https://docs.example.com/api",
			LicenseAssessment:   "UNKNOWN",
			Authentication:      "UNKNOWN",
			Pricing:             "UNKNOWN",
			Evidence: []evidence.Evidence{
				{Claim: "PROVIDER_IDENTITY", URL: "https://example.com/about", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
				{Claim: "OFFICIAL_HOMEPAGE", URL: "https://example.com", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
				{Claim: "DOCUMENTATION", URL: "https://docs.example.com/api", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
			},
		}},
	}
}

func TestBuildProducesNonImportableCurationDraft(t *testing.T) {
	result := Build(validEvidencePack())
	if result.Ready != 1 || result.Blocked != 0 || len(result.Drafts) != 1 {
		t.Fatalf("unexpected handoff summary: %+v", result)
	}
	draft := result.Drafts[0]
	if draft.Status != StatusNeedsAPIMetadata || draft.ImportEligible {
		t.Fatalf("draft must remain non-importable: %+v", draft)
	}
	if draft.Provider.Slug != "example-provider" {
		t.Fatalf("unexpected provider slug: %q", draft.Provider.Slug)
	}
	if len(draft.MissingAPIMetadata) == 0 {
		t.Fatal("API-specific metadata requirements must remain explicit")
	}
	if err := draft.ValidateHandoff(); err != nil {
		t.Fatalf("valid handoff rejected: %v", err)
	}
}

func TestBuildPreservesBlockedEvidenceStatus(t *testing.T) {
	pack := validEvidencePack()
	pack.Submissions[0].Evidence[0].SourceType = "THIRD_PARTY"
	result := Build(pack)
	if result.Blocked != 1 || result.Drafts[0].Status != StatusBlockedEvidence {
		t.Fatalf("blocked evidence must remain blocked: %+v", result)
	}
	if result.Drafts[0].ImportEligible {
		t.Fatal("blocked evidence must never be import eligible")
	}
}

func TestSourceClaimsMapToImporterSourceKinds(t *testing.T) {
	cases := map[string]string{
		"OFFICIAL_HOMEPAGE": "OFFICIAL_HOMEPAGE",
		"DOCUMENTATION":     "DOCUMENTATION",
		"TERMS_LICENSE":     "TERMS",
		"AUTHENTICATION":    "AUTHENTICATION",
		"PRICING":           "PRICING",
		"RATE_LIMITS":       "RATE_LIMITS",
		"API_AVAILABILITY":  "STATUS",
		"PROVIDER_IDENTITY": "OTHER",
	}
	for claim, expected := range cases {
		if actual := sourceKind(claim); actual != expected {
			t.Errorf("sourceKind(%q) = %q, want %q", claim, actual, expected)
		}
	}
}

func TestSlugifyProviderName(t *testing.T) {
	if got := slugify("  Example & Co.  "); got != "example-co" {
		t.Fatalf("slugify returned %q", got)
	}
}
