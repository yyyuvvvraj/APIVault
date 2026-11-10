package triage

import (
	"testing"
	"time"
)

func TestBuildKeepsEveryLeadDiscoveryOnlyAndFlagsSharedIdentity(t *testing.T) {
	input := DiscoveryReport{
		GeneratedAt: time.Date(2026, 11, 10, 10, 0, 0, 0, time.UTC),
		Total: 3,
		Candidates: []DiscoveryLead{
			{Name: "Weather API", Description: "Weather data", URL: "https://example.com/api?utm_source=test&key=public", Category: "Weather", DirectoryURL: "https://directory.example", SourceRevision: "abc", Status: "DISCOVERY_ONLY"},
			{Name: "Weather API", Description: "Forecasts", URL: "https://example.com/forecast?gclid=abc", Category: "Unknown", DirectoryURL: "https://directory.example", SourceRevision: "abc", Status: "DISCOVERY_ONLY"},
			{Name: "Finance API", Description: "Rates", URL: "https://finance.example/api", Category: "Finance", DirectoryURL: "https://directory.example", SourceRevision: "abc", Status: "DISCOVERY_ONLY"},
		},
	}
	report, err := Build(input)
	if err != nil {
		t.Fatal(err)
	}
	if report.Processed != 3 || report.Rejected != 0 {
		t.Fatalf("unexpected counts: processed=%d rejected=%d", report.Processed, report.Rejected)
	}
	if report.SharedHostnameGroups != 1 || report.DuplicateNameGroups != 1 {
		t.Fatalf("expected shared hostname and name groups, got %#v", report)
	}
	if report.Candidates[0].CanonicalURL != "https://example.com/api?key=public" {
		t.Fatalf("tracking cleanup changed non-tracking query or failed: %s", report.Candidates[0].CanonicalURL)
	}
	if report.Candidates[0].ReviewStatus != "REVIEW_REQUIRED" || report.Candidates[0].Status != "DISCOVERY_ONLY" {
		t.Fatalf("candidate was incorrectly promoted: %#v", report.Candidates[0])
	}
	if report.Candidates[1].SuggestedCategory != "" {
		t.Fatalf("unknown category must remain unmapped")
	}
	if report.RemovedTrackingParams != 2 {
		t.Fatalf("removed %d tracking params, want 2", report.RemovedTrackingParams)
	}
}

func TestBuildRejectsUnsafeAndMalformedEntriesWithoutPromotingOthers(t *testing.T) {
	input := DiscoveryReport{Total: 2, Candidates: []DiscoveryLead{
		{Name: "Bad", Description: "unsafe", URL: "http://example.com", Status: "DISCOVERY_ONLY"},
		{Name: "Good", Description: "safe lead", URL: "https://good.example/api", Category: "Development", Status: "DISCOVERY_ONLY"},
	}}
	report, err := Build(input)
	if err != nil {
		t.Fatal(err)
	}
	if report.Rejected != 1 || report.Processed != 1 {
		t.Fatalf("unexpected counts: %#v", report)
	}
	if report.Candidates[0].SuggestedCategory != "Developer Tools" {
		t.Fatalf("unexpected category mapping: %#v", report.Candidates[0])
	}
	if report.Candidates[0].Status != "DISCOVERY_ONLY" {
		t.Fatalf("lead must remain discovery-only")
	}
}

func TestBuildRejectsMismatchedTotal(t *testing.T) {
	_, err := Build(DiscoveryReport{Total: 2, Candidates: []DiscoveryLead{{Name: "One", Description: "desc", URL: "https://one.example", Status: "DISCOVERY_ONLY"}}})
	if err == nil {
		t.Fatal("expected mismatched total to fail")
	}
}
