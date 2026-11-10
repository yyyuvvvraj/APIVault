package triage

import (
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"
)

type DiscoveryReport struct {
	GeneratedAt time.Time       `json:"generatedAt"`
	Total       int             `json:"total"`
	Notice      string          `json:"notice"`
	Candidates  []DiscoveryLead `json:"candidates"`
}

type DiscoveryLead struct {
	Name           string `json:"name"`
	Description    string `json:"description"`
	URL            string `json:"url"`
	Category       string `json:"category"`
	DirectoryURL   string `json:"directoryUrl"`
	SourceRevision string `json:"sourceRevision"`
	Status         string `json:"status"`
}

type Candidate struct {
	Name               string   `json:"name"`
	Description        string   `json:"description"`
	OriginalURL        string   `json:"originalUrl"`
	CanonicalURL       string   `json:"canonicalUrl"`
	Hostname           string   `json:"hostname"`
	SourceCategory     string   `json:"sourceCategory"`
	SuggestedCategory  string   `json:"suggestedCategory,omitempty"`
	DirectoryURL       string   `json:"directoryUrl"`
	SourceRevision     string   `json:"sourceRevision"`
	Status             string   `json:"status"`
	ReviewStatus       string   `json:"reviewStatus"`
	ReviewReasons      []string `json:"reviewReasons"`
	TrackingParameters []string `json:"removedTrackingParameters,omitempty"`
}

type Report struct {
	GeneratedAt             time.Time      `json:"generatedAt"`
	SourceGeneratedAt       time.Time      `json:"sourceGeneratedAt"`
	SourceTotal             int            `json:"sourceTotal"`
	Processed               int            `json:"processed"`
	Rejected                int            `json:"rejected"`
	ExactURLDuplicateGroups int            `json:"exactUrlDuplicateGroups"`
	SharedHostnameGroups    int            `json:"sharedHostnameGroups"`
	DuplicateNameGroups     int            `json:"duplicateNameGroups"`
	UnmappedCategory        int            `json:"unmappedCategory"`
	RemovedTrackingParams   int            `json:"removedTrackingParameters"`
	CategoryBreakdown       map[string]int `json:"categoryBreakdown"`
	Notice                  string         `json:"notice"`
	Candidates              []Candidate    `json:"candidates"`
}

var categoryMap = map[string]string{
	"ai": "AI & Machine Learning", "artificial intelligence": "AI & Machine Learning",
	"machine learning": "AI & Machine Learning",
	"communication":    "Communication", "email": "Communication", "social": "Communication",
	"finance": "Finance", "financial": "Finance", "cryptocurrency": "Finance",
	"currency exchange": "Finance", "stock market": "Finance",
	"geocoding": "Maps & Geospatial", "geolocation": "Maps & Geospatial",
	"maps": "Maps & Geospatial", "mapping": "Maps & Geospatial",
	"weather": "Weather & Environment", "environment": "Weather & Environment", "climate": "Weather & Environment",
	"media": "Media", "music": "Media", "video": "Media", "images": "Media",
	"documents": "Productivity", "documents & productivity": "Productivity", "productivity": "Productivity", "calendar": "Productivity",
	"science": "Science & Education", "science & math": "Science & Education", "education": "Science & Education",
	"open data": "Data & Analytics", "data": "Data & Analytics", "analytics": "Data & Analytics",
	"development": "Developer Tools", "developer tools": "Developer Tools", "programming": "Developer Tools", "continuous integration": "Developer Tools",
	"games & comics": "Media", "entertainment": "Media", "news": "Media", "photography": "Media",
}

func NormalizeCategory(source string) string {
	return categoryMap[strings.ToLower(strings.TrimSpace(source))]
}

func Build(input DiscoveryReport) (Report, error) {
	if len(input.Candidates) == 0 {
		return Report{}, fmt.Errorf("discovery report contains no candidates")
	}
	if input.Total != 0 && input.Total != len(input.Candidates) {
		return Report{}, fmt.Errorf("discovery total %d does not match candidate count %d", input.Total, len(input.Candidates))
	}

	out := Report{
		GeneratedAt: time.Now().UTC(), SourceGeneratedAt: input.GeneratedAt,
		SourceTotal: len(input.Candidates), CategoryBreakdown: map[string]int{},
		Notice: "Triage output only. Every candidate requires independent provider, terms, licensing, evidence, and identity review. This report is not an import manifest and cannot verify or publish APIs.",
	}
	canonicalCounts := map[string]int{}
	hostCounts := map[string]int{}
	nameCounts := map[string]int{}
	canonicalURLs := make([]string, len(input.Candidates))
	hostnames := make([]string, len(input.Candidates))
	nameKeys := make([]string, len(input.Candidates))
	trackingByIndex := make([][]string, len(input.Candidates))

	for i, lead := range input.Candidates {
		if strings.TrimSpace(lead.Name) == "" || strings.TrimSpace(lead.Description) == "" || lead.Status != "DISCOVERY_ONLY" {
			out.Rejected++
			continue
		}
		if len(lead.SourceRevision) != 40 || !isHex(lead.SourceRevision) {
			out.Rejected++
			continue
		}
		directory, err := url.Parse(strings.TrimSpace(lead.DirectoryURL))
		if err != nil || directory.Scheme != "https" || directory.Hostname() == "" || directory.User != nil {
			out.Rejected++
			continue
		}
		parsed, err := url.Parse(strings.TrimSpace(lead.URL))
		if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil {
			out.Rejected++
			continue
		}
		query, err := url.ParseQuery(parsed.RawQuery)
		if err != nil {
			out.Rejected++
			continue
		}
		host := strings.ToLower(strings.TrimSuffix(parsed.Hostname(), "."))
		if host == "" {
			out.Rejected++
			continue
		}
		parsed.Scheme = "https"
		parsed.Host = strings.ToLower(parsed.Host)
		parsed.Fragment = ""
		parsed.RawFragment = ""
		for key := range query {
			lower := strings.ToLower(key)
			if strings.HasPrefix(lower, "utm_") || lower == "gclid" || lower == "fbclid" || lower == "mc_cid" || lower == "mc_eid" {
				delete(query, key)
				trackingByIndex[i] = append(trackingByIndex[i], key)
			}
		}
		sort.Strings(trackingByIndex[i])
		parsed.RawQuery = query.Encode()
		canonicalURLs[i] = parsed.String()
		hostnames[i] = host
		nameKeys[i] = strings.ToLower(strings.Join(strings.Fields(lead.Name), " "))
		canonicalCounts[canonicalURLs[i]]++
		hostCounts[host]++
		nameCounts[nameKeys[i]]++
	}

	for i, lead := range input.Candidates {
		if canonicalURLs[i] == "" {
			continue
		}
		suggested := NormalizeCategory(lead.Category)
		reasons := []string{"provider homepage and official API documentation must be independently confirmed"}
		if canonicalCounts[canonicalURLs[i]] > 1 {
			reasons = append(reasons, "canonical URL is shared by multiple discovery entries")
		}
		if hostCounts[hostnames[i]] > 1 {
			reasons = append(reasons, "hostname is shared; determine whether entries are distinct APIs from one provider")
		}
		if nameCounts[nameKeys[i]] > 1 {
			reasons = append(reasons, "normalized API name is shared; resolve identity and aliases")
		}
		if suggested == "" {
			reasons = append(reasons, "source category has no conservative APIVault category mapping")
			out.UnmappedCategory++
		} else {
			out.CategoryBreakdown[suggested]++
		}
		out.RemovedTrackingParams += len(trackingByIndex[i])
		out.Candidates = append(out.Candidates, Candidate{
			Name: strings.TrimSpace(lead.Name), Description: strings.TrimSpace(lead.Description),
			OriginalURL: lead.URL, CanonicalURL: canonicalURLs[i], Hostname: hostnames[i],
			SourceCategory: lead.Category, SuggestedCategory: suggested,
			DirectoryURL: lead.DirectoryURL, SourceRevision: lead.SourceRevision,
			Status: "DISCOVERY_ONLY", ReviewStatus: "REVIEW_REQUIRED",
			ReviewReasons: reasons, TrackingParameters: trackingByIndex[i],
		})
	}
	out.Processed = len(out.Candidates)
	out.ExactURLDuplicateGroups = countGroups(canonicalCounts)
	out.SharedHostnameGroups = countGroups(hostCounts)
	out.DuplicateNameGroups = countGroups(nameCounts)
	if out.Processed+out.Rejected != len(input.Candidates) {
		return Report{}, fmt.Errorf("internal accounting mismatch")
	}
	return out, nil
}

func isHex(value string) bool {
	for _, char := range value {
		if !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F')) {
			return false
		}
	}
	return true
}

func countGroups(counts map[string]int) int {
	groups := 0
	for _, count := range counts {
		if count > 1 {
			groups++
		}
	}
	return groups
}
