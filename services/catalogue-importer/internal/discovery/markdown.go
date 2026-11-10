package discovery

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

type Candidate struct {
	Name              string `json:"name"`
	Description       string `json:"description"`
	HomepageURL       string `json:"homepageUrl"`
	UpstreamCategory  string `json:"upstreamCategory"`
	DirectoryURL      string `json:"directoryUrl"`
	DirectoryRevision string `json:"directoryRevision"`
	ReviewStatus      string `json:"reviewStatus"`
}

var entryLink = regexp.MustCompile(`^\s*\[([^\]]+)\]\((https?://[^\s)]+)\)\s*$`)
var htmlTag = regexp.MustCompile(`<[^>]*>`)
var immutableRevision = regexp.MustCompile(`^[0-9a-fA-F]{40}$`)

// ParseMarkdown extracts directory entries as discovery leads. It deliberately
// does not create APIVault import records or make verification/pricing claims.
func ParseMarkdown(markdown, directoryURL, revision string) ([]Candidate, error) {
	if strings.TrimSpace(markdown) == "" {
		return nil, fmt.Errorf("directory markdown is empty")
	}
	if !immutableRevision.MatchString(revision) {
		return nil, fmt.Errorf("a full 40-character immutable commit SHA is required")
	}
	if err := validateHTTPS(directoryURL); err != nil {
		return nil, fmt.Errorf("invalid directory URL: %w", err)
	}

	category := ""
	seen := make(map[string]struct{})
	var candidates []Candidate
	for _, rawLine := range strings.Split(markdown, "\n") {
		line := strings.TrimSpace(rawLine)
		if strings.HasPrefix(line, "### ") {
			category = strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(line, "### "), " API"))
			continue
		}
		if category == "" || !strings.HasPrefix(line, "|") {
			continue
		}
		cells := strings.Split(line, "|")
		if len(cells) < 3 {
			continue
		}
		match := entryLink.FindStringSubmatch(strings.TrimSpace(cells[1]))
		if len(match) != 3 {
			continue
		}
		name := cleanText(match[1])
		description := cleanText(strings.TrimSpace(cells[2]))
		rawURL := strings.TrimSpace(match[2])
		if name == "" || description == "" || validateHTTPS(rawURL) != nil {
			continue
		}
		parsed, _ := url.Parse(rawURL)
		key := strings.ToLower(parsed.Hostname()) + "|" + strings.TrimRight(parsed.EscapedPath(), "/")
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		candidates = append(candidates, Candidate{
			Name: name, Description: description, HomepageURL: rawURL,
			UpstreamCategory: category, DirectoryURL: directoryURL,
			DirectoryRevision: revision, ReviewStatus: "DISCOVERY_ONLY",
		})
	}
	return candidates, nil
}

func cleanText(value string) string {
	value = htmlTag.ReplaceAllString(value, " ")
	value = strings.ReplaceAll(value, "`", "")
	return strings.Join(strings.Fields(value), " ")
}

func validateHTTPS(raw string) error {
	parsed, err := url.ParseRequestURI(raw)
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil {
		return fmt.Errorf("expected an absolute HTTPS URL without credentials")
	}
	return nil
}
