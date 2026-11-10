package evidence

import (
	"fmt"
	"net"
	"net/url"
	"sort"
	"strings"
	"time"
)

const SchemaVersion = "1"

const (
	StatusReady   = "READY_FOR_MAINTAINER_REVIEW"
	StatusBlocked = "BLOCKED"
)

type Pack struct {
	SchemaVersion string       `json:"schemaVersion"`
	ReviewedAt    time.Time    `json:"reviewedAt"`
	Reviewer      string       `json:"reviewer"`
	Submissions   []Submission `json:"submissions"`
}

type Submission struct {
	ReviewID             string     `json:"reviewId"`
	ProviderName         string     `json:"providerName"`
	ProviderDomains      []string   `json:"providerDomains"`
	OfficialHomepageURL  string     `json:"officialHomepageUrl"`
	DocumentationURL     string     `json:"documentationUrl"`
	TermsURL             string     `json:"termsUrl,omitempty"`
	LicenseAssessment    string     `json:"licenseAssessment"`
	Authentication       string     `json:"authentication"`
	Pricing              string     `json:"pricing"`
	Evidence             []Evidence `json:"evidence"`
}

type Evidence struct {
	Claim      string    `json:"claim"`
	URL        string    `json:"url"`
	SourceType string    `json:"sourceType"`
	AccessedAt time.Time `json:"accessedAt"`
}

type Finding struct {
	ReviewID string   `json:"reviewId"`
	Status   string   `json:"status"`
	Issues   []string `json:"issues"`
}

type Report struct {
	GeneratedAt  time.Time `json:"generatedAt"`
	SchemaVersion string   `json:"schemaVersion"`
	Notice       string    `json:"notice"`
	Total        int       `json:"total"`
	Ready        int       `json:"ready"`
	Blocked      int       `json:"blocked"`
	Findings     []Finding `json:"findings"`
}

var licenseValues = map[string]bool{"ALLOWED": true, "RESTRICTED": true, "UNKNOWN": true}
var authenticationValues = map[string]bool{"NONE": true, "API_KEY": true, "OAUTH2": true, "OTHER": true, "UNKNOWN": true}
var pricingValues = map[string]bool{"FREE": true, "PAID": true, "FREEMIUM": true, "USAGE_BASED": true, "UNKNOWN": true}

var requiredClaims = []string{"PROVIDER_IDENTITY", "OFFICIAL_HOMEPAGE", "DOCUMENTATION"}

func Validate(pack Pack) Report {
	report := Report{
		GeneratedAt: time.Now().UTC(),
		SchemaVersion: SchemaVersion,
		Notice: "Structural evidence review only. READY means the submission is complete enough for a human maintainer to inspect; it does not authenticate sources, grant a license, verify an API, import records, or publish anything.",
		Total: len(pack.Submissions),
		Findings: make([]Finding, 0, len(pack.Submissions)),
	}

	seen := make(map[string]bool, len(pack.Submissions))
	for _, submission := range pack.Submissions {
		issues := validateSubmission(pack, submission)
		if seen[submission.ReviewID] {
			issues = append(issues, "reviewId is duplicated within this evidence pack")
		}
		seen[submission.ReviewID] = true
		sort.Strings(issues)

		status := StatusReady
		if len(issues) > 0 {
			status = StatusBlocked
			report.Blocked++
		} else {
			report.Ready++
		}
		report.Findings = append(report.Findings, Finding{
			ReviewID: submission.ReviewID,
			Status: status,
			Issues: issues,
		})
	}
	if pack.SchemaVersion != SchemaVersion {
		report.Notice = "Evidence pack schema version is unsupported. " + report.Notice
	}
	return report
}

func validateSubmission(pack Pack, item Submission) []string {
	var issues []string
	if pack.SchemaVersion != SchemaVersion {
		issues = append(issues, fmt.Sprintf("schemaVersion must be %q", SchemaVersion))
	}
	if pack.ReviewedAt.IsZero() {
		issues = append(issues, "reviewedAt is required")
	}
	if strings.TrimSpace(pack.Reviewer) == "" {
		issues = append(issues, "reviewer is required")
	}
	if strings.TrimSpace(item.ReviewID) == "" {
		issues = append(issues, "reviewId is required")
	}
	if strings.TrimSpace(item.ProviderName) == "" {
		issues = append(issues, "providerName is required")
	}

	domains := normalizeDomains(item.ProviderDomains)
	if len(domains) == 0 {
		issues = append(issues, "at least one provider-controlled domain must be declared")
	}
	homepageHost, homepageOK := validateHTTPSURL(item.OfficialHomepageURL)
	if !homepageOK {
		issues = append(issues, "officialHomepageUrl must be a valid HTTPS URL without embedded credentials")
	} else if !matchesDomain(homepageHost, domains) {
		issues = append(issues, "officialHomepageUrl host is not covered by providerDomains")
	}
	docsHost, docsOK := validateHTTPSURL(item.DocumentationURL)
	if !docsOK {
		issues = append(issues, "documentationUrl must be a valid HTTPS URL without embedded credentials")
	} else if !matchesDomain(docsHost, domains) {
		issues = append(issues, "documentationUrl host is not covered by providerDomains")
	}
	if item.TermsURL != "" {
		termsHost, ok := validateHTTPSURL(item.TermsURL)
		if !ok {
			issues = append(issues, "termsUrl must be a valid HTTPS URL without embedded credentials")
		} else if !matchesDomain(termsHost, domains) {
			issues = append(issues, "termsUrl host is not covered by providerDomains")
		}
	}

	if !licenseValues[item.LicenseAssessment] {
		issues = append(issues, "licenseAssessment must be ALLOWED, RESTRICTED, or UNKNOWN")
	}
	if !authenticationValues[item.Authentication] {
		issues = append(issues, "authentication must be NONE, API_KEY, OAUTH2, OTHER, or UNKNOWN")
	}
	if !pricingValues[item.Pricing] {
		issues = append(issues, "pricing must be FREE, PAID, FREEMIUM, USAGE_BASED, or UNKNOWN")
	}
	if (item.LicenseAssessment == "ALLOWED" || item.LicenseAssessment == "RESTRICTED") && item.TermsURL == "" {
		issues = append(issues, "termsUrl is required when licenseAssessment is not UNKNOWN")
	}

	evidenceByClaim := make(map[string][]Evidence)
	for index, evidence := range item.Evidence {
		prefix := fmt.Sprintf("evidence[%d]", index)
		if !validClaim(evidence.Claim) {
			issues = append(issues, prefix+" has an unsupported claim")
			continue
		}
		host, ok := validateHTTPSURL(evidence.URL)
		if !ok {
			issues = append(issues, prefix+" URL must be valid HTTPS without embedded credentials")
			continue
		}
		switch evidence.SourceType {
		case "PROVIDER_CONTROLLED":
			if !matchesDomain(host, domains) {
				issues = append(issues, prefix+" provider-controlled URL host is not covered by providerDomains")
			}
		case "THIRD_PARTY":
			// Third-party references are retained for context but never satisfy official evidence requirements.
		default:
			issues = append(issues, prefix+" sourceType must be PROVIDER_CONTROLLED or THIRD_PARTY")
		}
		if evidence.AccessedAt.IsZero() {
			issues = append(issues, prefix+" accessedAt is required")
		}
		evidenceByClaim[evidence.Claim] = append(evidenceByClaim[evidence.Claim], evidence)
	}

	claims := append([]string{}, requiredClaims...)
	if item.TermsURL != "" || item.LicenseAssessment != "UNKNOWN" {
		claims = append(claims, "TERMS_LICENSE")
	}
	if item.Authentication != "UNKNOWN" {
		claims = append(claims, "AUTHENTICATION")
	}
	if item.Pricing != "UNKNOWN" {
		claims = append(claims, "PRICING")
	}
	for _, claim := range claims {
		if !hasOfficialEvidence(evidenceByClaim[claim], domains) {
			issues = append(issues, "missing provider-controlled evidence for "+claim)
		}
	}
	if homepageOK && !hasEvidenceURL(evidenceByClaim["OFFICIAL_HOMEPAGE"], item.OfficialHomepageURL) {
		issues = append(issues, "OFFICIAL_HOMEPAGE evidence must include officialHomepageUrl")
	}
	if docsOK && !hasEvidenceURL(evidenceByClaim["DOCUMENTATION"], item.DocumentationURL) {
		issues = append(issues, "DOCUMENTATION evidence must include documentationUrl")
	}
	if item.TermsURL != "" && !hasEvidenceURL(evidenceByClaim["TERMS_LICENSE"], item.TermsURL) {
		issues = append(issues, "TERMS_LICENSE evidence must include termsUrl")
	}
	return issues
}

func validClaim(claim string) bool {
	switch claim {
	case "PROVIDER_IDENTITY", "OFFICIAL_HOMEPAGE", "DOCUMENTATION", "TERMS_LICENSE", "AUTHENTICATION", "PRICING", "RATE_LIMITS", "API_AVAILABILITY":
		return true
	default:
		return false
	}
}

func normalizeDomains(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		host := strings.ToLower(strings.TrimSuffix(strings.TrimSpace(value), "."))
		if host == "" || strings.Contains(host, "/") || strings.Contains(host, ":") || strings.Contains(host, "*") {
			continue
		}
		if net.ParseIP(host) != nil {
			continue
		}
		if !seen[host] {
			seen[host] = true
			out = append(out, host)
		}
	}
	return out
}

func validateHTTPSURL(raw string) (string, bool) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil {
		return "", false
	}
	if parsed.Opaque != "" || parsed.Host == "" {
		return "", false
	}
	return strings.ToLower(strings.TrimSuffix(parsed.Hostname(), ".")), true
}

func matchesDomain(host string, domains []string) bool {
	for _, domain := range domains {
		if host == domain || strings.HasSuffix(host, "."+domain) {
			return true
		}
	}
	return false
}

func hasOfficialEvidence(items []Evidence, domains []string) bool {
	for _, item := range items {
		host, ok := validateHTTPSURL(item.URL)
		if ok && item.SourceType == "PROVIDER_CONTROLLED" && matchesDomain(host, domains) {
			return true
		}
	}
	return false
}

func hasEvidenceURL(items []Evidence, target string) bool {
	for _, item := range items {
		if item.URL == target && item.SourceType == "PROVIDER_CONTROLLED" {
			return true
		}
	}
	return false
}
