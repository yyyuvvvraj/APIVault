package curation

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/evidence"
)

const SchemaVersion = "1"

const (
	StatusNeedsAPIMetadata = "NEEDS_API_METADATA"
	StatusBlockedEvidence  = "BLOCKED_EVIDENCE"
)

type Pack struct {
	SchemaVersion string    `json:"schemaVersion"`
	GeneratedAt   time.Time `json:"generatedAt"`
	Notice        string    `json:"notice"`
	Total         int       `json:"total"`
	Ready         int       `json:"ready"`
	Blocked       int       `json:"blocked"`
	Drafts        []Draft   `json:"drafts"`
}

type Draft struct {
	ReviewID            string           `json:"reviewId"`
	Status              string           `json:"status"`
	ImportEligible      bool             `json:"importEligible"`
	Provider            Provider         `json:"provider"`
	OfficialHomepageURL string           `json:"officialHomepageUrl"`
	DocumentationURL    string           `json:"documentationUrl"`
	TermsURL            string           `json:"termsUrl,omitempty"`
	LicenseAssessment   string           `json:"licenseAssessment"`
	Authentication      string           `json:"authentication"`
	Pricing             string           `json:"pricing"`
	Evidence            []EvidenceSource `json:"evidence"`
	MissingAPIMetadata  []string         `json:"missingApiMetadata"`
	EvidenceIssues      []string         `json:"evidenceIssues"`
}

type Provider struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	HomepageURL string `json:"homepageUrl"`
}

type EvidenceSource struct {
	Claim      string    `json:"claim"`
	Kind       string    `json:"kind"`
	URL        string    `json:"url"`
	IsOfficial bool      `json:"isOfficial"`
	AccessedAt time.Time `json:"accessedAt"`
}

var requiredAPIMetadata = []string{
	"apiName",
	"summary",
	"description",
	"baseUrl",
	"categories",
	"apiSpecificAuthenticationDetails",
	"apiSpecificPricingAndLimits",
}

func Build(pack evidence.Pack) Pack {
	validation := evidence.Validate(pack)
	result := Pack{
		SchemaVersion: SchemaVersion,
		GeneratedAt:   time.Now().UTC(),
		Notice:        "Curation handoff only. This output is intentionally NOT an importer manifest. Provider-level evidence cannot supply API-specific identity, endpoint, summary, category, or API-specific auth/pricing facts. No database connection, import, verification, or publication occurs.",
		Total:         len(pack.Submissions),
		Ready:         validation.Ready,
		Blocked:       validation.Blocked,
		Drafts:        make([]Draft, 0, len(pack.Submissions)),
	}

	for index, submission := range pack.Submissions {
		finding := validation.Findings[index]
		draft := Draft{
			ReviewID:       submission.ReviewID,
			Status:         StatusNeedsAPIMetadata,
			ImportEligible: false,
			Provider: Provider{
				Slug:        slugify(submission.ProviderName),
				Name:        strings.TrimSpace(submission.ProviderName),
				HomepageURL: strings.TrimSpace(submission.OfficialHomepageURL),
			},
			OfficialHomepageURL: strings.TrimSpace(submission.OfficialHomepageURL),
			DocumentationURL:    strings.TrimSpace(submission.DocumentationURL),
			TermsURL:            strings.TrimSpace(submission.TermsURL),
			LicenseAssessment:   submission.LicenseAssessment,
			Authentication:      submission.Authentication,
			Pricing:             submission.Pricing,
			Evidence:            make([]EvidenceSource, 0, len(submission.Evidence)),
			MissingAPIMetadata:  append([]string{}, requiredAPIMetadata...),
			EvidenceIssues:      append([]string{}, finding.Issues...),
		}
		if finding.Status != evidence.StatusReady {
			draft.Status = StatusBlockedEvidence
		}
		for _, source := range submission.Evidence {
			draft.Evidence = append(draft.Evidence, EvidenceSource{
				Claim:      source.Claim,
				Kind:       sourceKind(source.Claim),
				URL:        source.URL,
				IsOfficial: source.SourceType == "PROVIDER_CONTROLLED",
				AccessedAt: source.AccessedAt,
			})
		}
		sort.Slice(draft.Evidence, func(i, j int) bool {
			if draft.Evidence[i].Claim == draft.Evidence[j].Claim {
				return draft.Evidence[i].URL < draft.Evidence[j].URL
			}
			return draft.Evidence[i].Claim < draft.Evidence[j].Claim
		})
		result.Drafts = append(result.Drafts, draft)
	}
	return result
}

func sourceKind(claim string) string {
	switch claim {
	case "OFFICIAL_HOMEPAGE":
		return "OFFICIAL_HOMEPAGE"
	case "DOCUMENTATION":
		return "DOCUMENTATION"
	case "TERMS_LICENSE":
		return "TERMS"
	case "AUTHENTICATION":
		return "AUTHENTICATION"
	case "PRICING":
		return "PRICING"
	case "RATE_LIMITS":
		return "RATE_LIMITS"
	case "API_AVAILABILITY":
		return "STATUS"
	default:
		return "OTHER"
	}
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	lastDash := false
	for _, char := range value {
		if char >= 'a' && char <= 'z' || char >= '0' && char <= '9' {
			builder.WriteRune(char)
			lastDash = false
		} else if builder.Len() > 0 && !lastDash {
			builder.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}

func (draft Draft) ValidateHandoff() error {
	if draft.ImportEligible {
		return fmt.Errorf("curation handoff drafts must never be marked import eligible")
	}
	if draft.Status != StatusNeedsAPIMetadata && draft.Status != StatusBlockedEvidence {
		return fmt.Errorf("unsupported curation status %q", draft.Status)
	}
	if len(draft.MissingAPIMetadata) == 0 {
		return fmt.Errorf("API-specific metadata requirements must remain explicit")
	}
	return nil
}
