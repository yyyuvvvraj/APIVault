package reviewpack

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/triage"
)

const (
	PriorityHigh   = "HIGH"
	PriorityNormal = "NORMAL"
	PriorityLow    = "LOW"
)

type Candidate struct {
	ReviewID             string   `json:"reviewId"`
	Name                 string   `json:"name"`
	Description          string   `json:"description"`
	OriginalURL          string   `json:"originalUrl"`
	CanonicalURL         string   `json:"canonicalUrl"`
	SourceCategory       string   `json:"sourceCategory"`
	SuggestedCategory    string   `json:"suggestedCategory,omitempty"`
	Priority             string   `json:"priority"`
	ReviewReasons        []string `json:"reviewReasons"`
	SourceDirectory      string   `json:"sourceDirectory"`
	SourceRevision       string   `json:"sourceRevision"`
	// These remain empty/unknown until independently established from provider-controlled evidence.
	ProviderName         string   `json:"providerName"`
	OfficialHomepageURL  string   `json:"officialHomepageUrl"`
	DocumentationURL     string   `json:"documentationUrl"`
	TermsURL             string   `json:"termsUrl"`
	LicenseAssessment    string   `json:"licenseAssessment"`
	Authentication       string   `json:"authentication"`
	Pricing              string   `json:"pricing"`
	EvidenceReviewStatus string   `json:"evidenceReviewStatus"`
	CatalogueStatus      string   `json:"catalogueStatus"`
}

type Report struct {
	GeneratedAt    time.Time        `json:"generatedAt"`
	SourceTotal    int              `json:"sourceTotal"`
	Offset         int              `json:"offset"`
	Limit          int              `json:"limit"`
	Returned       int              `json:"returned"`
	HasMore        bool             `json:"hasMore"`
	PriorityCounts map[string]int   `json:"priorityCounts"`
	CategoryCounts map[string]int   `json:"categoryCounts"`
	Notice         string           `json:"notice"`
	Candidates     []Candidate      `json:"candidates"`
}

// Build creates a deterministic, paginated research queue, never an importer manifest.
func Build(input triage.Report, offset, limit int) (Report, error) {
	if offset < 0 || limit < 1 || limit > 500 {
		return Report{}, fmt.Errorf("offset must be >= 0 and limit must be between 1 and 500")
	}
	if input.Processed != len(input.Candidates) {
		return Report{}, fmt.Errorf("triage processed count %d does not match candidate count %d", input.Processed, len(input.Candidates))
	}

	all := make([]Candidate, 0, len(input.Candidates))
	for _, item := range input.Candidates {
		if item.Status != "DISCOVERY_ONLY" || item.ReviewStatus != "REVIEW_REQUIRED" {
			return Report{}, fmt.Errorf("candidate %q is not discovery-only/review-required", item.Name)
		}

		priority := PriorityHigh
		if item.SuggestedCategory == "" {
			priority = PriorityLow
		} else if containsReason(item.ReviewReasons, "hostname is shared") ||
			containsReason(item.ReviewReasons, "normalized API name is shared") ||
			containsReason(item.ReviewReasons, "canonical URL is shared") {
			priority = PriorityNormal
		}

		all = append(all, Candidate{
			ReviewID:          reviewID(item),
			Name:              item.Name,
			Description:       item.Description,
			OriginalURL:       item.OriginalURL,
			CanonicalURL:      item.CanonicalURL,
			SourceCategory:    item.SourceCategory,
			SuggestedCategory: item.SuggestedCategory,
			Priority:          priority,
			ReviewReasons:     append([]string(nil), item.ReviewReasons...),
			SourceDirectory:   item.DirectoryURL,
			SourceRevision:    item.SourceRevision,
			ProviderName:      "",
			OfficialHomepageURL: "",
			DocumentationURL: "",
			TermsURL: "",
			LicenseAssessment: "UNASSESSED",
			Authentication: "UNKNOWN",
			Pricing: "UNKNOWN",
			EvidenceReviewStatus: "NOT_REVIEWED",
			CatalogueStatus: "DISCOVERY_ONLY",
		})
	}

	rank := func(priority string) int {
		switch priority {
		case PriorityHigh:
			return 0
		case PriorityNormal:
			return 1
		default:
			return 2
		}
	}
	sort.Slice(all, func(i, j int) bool {
		if rank(all[i].Priority) != rank(all[j].Priority) {
			return rank(all[i].Priority) < rank(all[j].Priority)
		}
		if all[i].SuggestedCategory != all[j].SuggestedCategory {
			return all[i].SuggestedCategory < all[j].SuggestedCategory
		}
		if strings.ToLower(all[i].Name) != strings.ToLower(all[j].Name) {
			return strings.ToLower(all[i].Name) < strings.ToLower(all[j].Name)
		}
		return all[i].ReviewID < all[j].ReviewID
	})

	end := offset + limit
	if end > len(all) {
		end = len(all)
	}
	page := []Candidate{}
	if offset < len(all) {
		page = all[offset:end]
	}

	priorityCounts, categoryCounts := map[string]int{}, map[string]int{}
	for _, item := range all {
		priorityCounts[item.Priority]++
		category := item.SuggestedCategory
		if category == "" {
			category = "UNMAPPED"
		}
		categoryCounts[category]++
	}

	return Report{
		GeneratedAt:    time.Now().UTC(),
		SourceTotal:    len(all),
		Offset:         offset,
		Limit:          limit,
		Returned:       len(page),
		HasMore:        end < len(all),
		PriorityCounts: priorityCounts,
		CategoryCounts: categoryCounts,
		Notice:         "Research queue only. Provider identity, official homepage, documentation, terms, licensing, authentication and pricing must be independently reviewed from provider-controlled evidence. Blank evidence fields are deliberate. This is not an importer manifest; no database writes, verification or publication occur.",
		Candidates:     page,
	}, nil
}

func reviewID(item triage.Candidate) string {
	sum := sha256.Sum256([]byte(item.SourceRevision + "\x00" + item.CanonicalURL + "\x00" + strings.ToLower(strings.Join(strings.Fields(item.Name), " "))))
	return hex.EncodeToString(sum[:12])
}

func containsReason(reasons []string, prefix string) bool {
	for _, reason := range reasons {
		if strings.HasPrefix(reason, prefix) {
			return true
		}
	}
	return false
}
