package evidence

import (
	"strings"
	"testing"
	"time"
)

func validPack() Pack {
	now := time.Date(2026, 11, 10, 12, 0, 0, 0, time.UTC)
	return Pack{
		SchemaVersion: SchemaVersion,
		ReviewedAt: now,
		Reviewer: "maintainer@example.com",
		Submissions: []Submission{{
			ReviewID: "review-123",
			ProviderName: "Example",
			ProviderDomains: []string{"example.com"},
			OfficialHomepageURL: "https://example.com",
			DocumentationURL: "https://docs.example.com/api",
			TermsURL: "https://example.com/terms",
			LicenseAssessment: "ALLOWED",
			Authentication: "API_KEY",
			Pricing: "FREEMIUM",
			Evidence: []Evidence{
				{Claim: "PROVIDER_IDENTITY", URL: "https://example.com/about", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
				{Claim: "OFFICIAL_HOMEPAGE", URL: "https://example.com", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
				{Claim: "DOCUMENTATION", URL: "https://docs.example.com/api", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
				{Claim: "TERMS_LICENSE", URL: "https://example.com/terms", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
				{Claim: "AUTHENTICATION", URL: "https://docs.example.com/auth", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
				{Claim: "PRICING", URL: "https://example.com/pricing", SourceType: "PROVIDER_CONTROLLED", AccessedAt: now},
			},
		}},
	}
}

func TestValidateCompleteProviderEvidence(t *testing.T) {
	report := Validate(validPack())
	if report.Ready != 1 || report.Blocked != 0 {
		t.Fatalf("expected one ready submission, got %+v", report)
	}
	if report.Findings[0].Status != StatusReady {
		t.Fatalf("unexpected status: %s", report.Findings[0].Status)
	}
}

func TestThirdPartyEvidenceDoesNotSatisfyOfficialClaims(t *testing.T) {
	pack := validPack()
	pack.Submissions[0].Evidence[0].SourceType = "THIRD_PARTY"
	report := Validate(pack)
	if report.Blocked != 1 {
		t.Fatalf("expected blocked report, got %+v", report)
	}
	if !containsIssue(report.Findings[0].Issues, "PROVIDER_IDENTITY") {
		t.Fatalf("expected provider identity evidence issue, got %v", report.Findings[0].Issues)
	}
}

func TestProviderDomainBoundaryIsEnforced(t *testing.T) {
	pack := validPack()
	pack.Submissions[0].DocumentationURL = "https://example.com.attacker.invalid/docs"
	report := Validate(pack)
	if !containsIssue(report.Findings[0].Issues, "not covered by providerDomains") {
		t.Fatalf("expected domain boundary issue, got %v", report.Findings[0].Issues)
	}
}

func TestCredentialsAndNonHTTPSURLsAreRejected(t *testing.T) {
	pack := validPack()
	pack.Submissions[0].OfficialHomepageURL = "https://user:password@example.com"
	pack.Submissions[0].DocumentationURL = "http://docs.example.com"
	report := Validate(pack)
	if !containsIssue(report.Findings[0].Issues, "valid HTTPS URL") {
		t.Fatalf("expected HTTPS/credential issues, got %v", report.Findings[0].Issues)
	}
}

func TestDuplicateReviewIDsAreRejected(t *testing.T) {
	pack := validPack()
	pack.Submissions = append(pack.Submissions, pack.Submissions[0])
	report := Validate(pack)
	if report.Blocked != 2 {
		t.Fatalf("expected both duplicate submissions to be blocked, got %+v", report)
	}
}

func containsIssue(issues []string, fragment string) bool {
	for _, issue := range issues {
		if strings.Contains(issue, fragment) {
			return true
		}
	}
	return false
}
