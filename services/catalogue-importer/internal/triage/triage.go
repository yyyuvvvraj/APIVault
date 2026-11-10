package triage

import (
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"
)

type DiscoveryReport struct {
	GeneratedAt time.Time         `json:"generatedAt"`
	Total       int               `json:"total"`
	Notice      string            `json:"notice"`
	Candidates  []DiscoveryLead   `json:"candidates"`
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
	Name                 string   `json:"name"`
	Description          string   `json:"description"`
	OriginalURL          string   `json:"originalUrl"`
	CanonicalURL         string   `json:"canonicalUrl"`
	Hostname             string   `json:"hostname"`
	SourceCategory       string   `json:"sourceCategory"`
	SuggestedCategory    string   `json:"suggestedCategory,omitempty"`
	DirectoryURL         string   `json:"directoryUrl"`
	SourceRevision       string   `json:"sourceRevision"`
	Status               string   `json:"status"`
	ReviewStatus         string   `json:"reviewStatus"`
	ReviewReasons        []string `json:"reviewReasons"`
	TrackingParameters   []string `json:"removedTrackingParameters,omitempty"`
}

type Report struct {
	GeneratedAt          time.Time         `json:"generatedAt"`
	SourceGeneratedAt    time.Time         `json:"sourceGeneratedAt"`
	SourceTotal          int               `json:"sourceTotal"`
	Processed            int               `json:"processed"`
	Rejected             int               `json:"rejected"`
	ExactURLDuplicateGroups int             `json:"exactUrlDuplicateGroups"`
	SharedHostnameGroups int               `json:"sharedHostnameGroups"`
	DuplicateNameGroups  int               `json:"duplicateNameGroups"`
	UnmappedCategory     int               `json:"unmappedCategory"`
	RemovedTrackingParams int              `json:"removedTrackingParameters"`
	CategoryBreakdown    map[string]int    `json:"categoryBreakdown"`
	Notice               string            `json:"notice"`
	Candidates           []Candidate       `json:"candidates"`
}

var categoryMap = map[string]string{
	"ai": "AI & Machine Learning",
	"artificial intelligence": "AI & Machine Learning",
	"machine learning": "AI & Machine Learning",
	"communication": "Communication",
	"email": "Communication",
	"social": "Communication",
	"finance": "Finance",
	"financial": "Finance",
	"cryptocurrency": "Finance",
	"currency exchange": "Finance",
	"stock market": "Finance",
	"geocoding": "Maps & Geospatial",
	"geolocation": "Maps & Geospatial",
	"maps": "Maps & Geospatial",
	"mapping": "Maps & Geospatial",
	"transportation": "Maps & Geospatial",
	"weather": "Weather & Environment",
	"environment": "Weather & Environment",
	"climate": "Weather & Environment",
	"media": "Media",
	"music": "Media",
	"video": "Media",
	"images": "Media",
	"documents": "Productivity",
	"productivity": "Productivity",
	"calendar": "Productivity",
	"science": "Science & Education",
	"education": "Science & Education",
	"government": "Data & Analytics",
	"open data": "Data & Analytics",
	"data": "Data & Analytics",
	"analytics": "Data & Analytics",
	"development": "Developer Tools",
	"developer tools": "Developer Tools",
	"security": "Developer Tools",
	"games": "Media",
	"games & comics": "Media",
}

func NormalizeCategory(source string) string {
	key := strings.ToLower(strings.TrimSpace(source))
	if mapped, ok := categoryMap[key]; ok {
		return mapped
	}
	return ""
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
	canonicalCounts, hostCounts, nameCounts := map[string]int{}, map[string]int{}, map[string]int{}
	canonicalURLs := make([]string, len(input.Candidates))
	hostnames := make([]string, len(input.Candidates))
	nameKeys := make([]string, len(input.Candidates))

	for i, lead := range input.Candidates {
		if strings.TrimSpace(lead.Name) == "" || strings.TrimSpace(lead.Description) == "" || lead.Status != "DISCOVERY_ONLY" {
			out.Rejected++
			continue
		}
		parsed, err := url.Parse(strings.TrimSpace(lead.URL))
		if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil {
			out.Rejected++
			continue
		}
		host := strings.ToLower(strings.TrimSuffix(parsed.Hostname(), "."))
		if host == "" || strings.Contains(host, " ") {
			out.Rejected++
			continue
		}
		parsed.Scheme = "https"
		parsed.Host = strings.ToLower(parsed.Host)
		parsed.Fragment = ""
		parsed.RawFragment = ""
		var removed []string
		query := parsed.Query()
		for key := range query {
			lower := strings.ToLower(key)
			if strings.HasPrefix(lower, "utm_") || lower == "gclid" || lower == "fbclid" || lower == "mc_cid" || lower == "mc_eid" {
				delete(query, key)
				removed = append(removed, key)
			}
		}
		sort.Strings(removed)
		parsed.RawQuery = query.Encode()
		canonical := parsed.String()
		nameKey := strings.ToLower(strings.Join(strings.Fields(lead.Name), " "))
		canonicalURLs[i], hostnames[i], nameKeys[i] = canonical, host, nameKey
		canonicalCounts[canonical]++
		hostCounts[host]++
		nameCounts[nameKey]++
		_ = removed
	}

	for i, lead := range input.Candidates {
		if canonicalURLs[i] == "" {
			continue
		}
		parsed, _ := url.Parse(strings.TrimSpace(lead.URL))
		removed := []string{}
		for key := range parsed.Query() {
			lower := strings.ToLower(key)
			if strings.HasPrefix(lower, "utm_") || lower == "gclid" || lower == "fbclid" || lower == "mc_cid" || lower == "mc_eid" {
				removed = append(removed, key)
			}
		}
		sort.Strings(removed)
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
		if len(removed) > 0 {
			out.RemovedTrackingParams += len(removed)
		}
		out.Candidates = append(out.Candidates, Candidate{
			Name: strings.TrimSpace(lead.Name), Description: strings.TrimSpace(lead.Description),
			OriginalURL: lead.URL, CanonicalURL: canonicalURLs[i], Hostname: hostnames[i],
			SourceCategory: lead.Category, SuggestedCategory: suggested,
			DirectoryURL: lead.DirectoryURL, SourceRevision: lead.SourceRevision,
			Status: "DISCOVERY_ONLY", ReviewStatus: "REVIEW_REQUIRED",
			ReviewReasons: reasons, TrackingParameters: removed,
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

func countGroups(counts map[string]int) int {
	groups := 0
	for _, count := range counts {
		if count > 1 {
			groups++
		}
	}
	return groups
}
