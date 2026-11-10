package reviewpack

import (
	"testing"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/triage"
)

func sampleReport() triage.Report {
	return triage.Report{Processed: 3, Candidates: []triage.Candidate{
		{
			Name: "Unmapped API", Description: "desc", OriginalURL: "https://unmapped.example",
			CanonicalURL: "https://unmapped.example", SourceCategory: "Odd",
			DirectoryURL: "https://directory.example", SourceRevision: "88706670ac0ffaad7bf3c6307747e2515f638bed",
			Status: "DISCOVERY_ONLY", ReviewStatus: "REVIEW_REQUIRED",
			ReviewReasons: []string{
				"provider homepage and official API documentation must be independently confirmed",
				"source category has no conservative APIVault category mapping",
			},
		},
		{
			Name: "Zeta API", Description: "desc", OriginalURL: "https://zeta.example",
			CanonicalURL: "https://zeta.example", SourceCategory: "Finance", SuggestedCategory: "Finance",
			DirectoryURL: "https://directory.example", SourceRevision: "88706670ac0ffaad7bf3c6307747e2515f638bed",
			Status: "DISCOVERY_ONLY", ReviewStatus: "REVIEW_REQUIRED",
			ReviewReasons: []string{"provider homepage and official API documentation must be independently confirmed"},
		},
		{
			Name: "Alpha API", Description: "desc", OriginalURL: "https://alpha.example",
			CanonicalURL: "https://alpha.example", SourceCategory: "Finance", SuggestedCategory: "Finance",
			DirectoryURL: "https://directory.example", SourceRevision: "88706670ac0ffaad7bf3c6307747e2515f638bed",
			Status: "DISCOVERY_ONLY", ReviewStatus: "REVIEW_REQUIRED",
			ReviewReasons: []string{
				"provider homepage and official API documentation must be independently confirmed",
				"hostname is shared; determine whether entries are distinct APIs from one provider",
			},
		},
	}}
}

func TestBuildPrioritizesMappedUnambiguousAndLeavesEvidenceBlank(t *testing.T) {
	report, err := Build(sampleReport(), 0, 10)
	if err != nil {
		t.Fatal(err)
	}
	if report.Returned != 3 || report.SourceTotal != 3 {
		t.Fatalf("unexpected pagination: %#v", report)
	}
	if report.Candidates[0].Name != "Zeta API" || report.Candidates[0].Priority != PriorityHigh {
		t.Fatalf("expected unambiguous mapped lead first: %#v", report.Candidates[0])
	}
	if report.Candidates[1].Priority != PriorityNormal || report.Candidates[2].Priority != PriorityLow {
		t.Fatalf("unexpected priority order: %#v", report.Candidates)
	}

	item := report.Candidates[0]
	if item.ProviderName != "" || item.OfficialHomepageURL != "" || item.DocumentationURL != "" ||
		item.TermsURL != "" || item.Authentication != "UNKNOWN" || item.Pricing != "UNKNOWN" ||
		item.CatalogueStatus != "DISCOVERY_ONLY" {
		t.Fatalf("evidence was invented or candidate promoted: %#v", item)
	}
}

func TestBuildPaginationIsStable(t *testing.T) {
	first, err := Build(sampleReport(), 0, 1)
	if err != nil {
		t.Fatal(err)
	}
	second, err := Build(sampleReport(), 1, 1)
	if err != nil {
		t.Fatal(err)
	}
	if !first.HasMore || first.Returned != 1 || second.Returned != 1 ||
		first.Candidates[0].ReviewID == second.Candidates[0].ReviewID {
		t.Fatalf("unexpected pages: %#v %#v", first, second)
	}
	again, err := Build(sampleReport(), 0, 1)
	if err != nil {
		t.Fatal(err)
	}
	if first.Candidates[0].ReviewID != again.Candidates[0].ReviewID {
		t.Fatal("review IDs/order must be deterministic")
	}
}

func TestBuildRejectsInvalidPaginationAndPromotedInput(t *testing.T) {
	if _, err := Build(sampleReport(), -1, 10); err == nil {
		t.Fatal("expected negative offset rejection")
	}
	if _, err := Build(sampleReport(), 0, 501); err == nil {
		t.Fatal("expected oversized page rejection")
	}
	bad := sampleReport()
	bad.Candidates[0].Status = "ACTIVE"
	if _, err := Build(bad, 0, 10); err == nil {
		t.Fatal("expected promoted input rejection")
	}
}
