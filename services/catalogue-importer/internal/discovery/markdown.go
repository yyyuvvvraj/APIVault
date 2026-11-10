package discovery

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

var (
	markdownLink = regexp.MustCompile(`\[([^\]]+)\]\((https?://[^\s)]+)\)`)
	immutableRevision = regexp.MustCompile(`^[0-9a-fA-F]{40}$`)
)

// Candidate is an unverified lead extracted from a community directory.
type Candidate struct {
	Name          string `json:"name"`
	Description   string `json:"description"`
	URL           string `json:"url"`
	Category      string `json:"category"`
	DirectoryURL  string `json:"directoryUrl"`
	SourceRevision string `json:"sourceRevision"`
	Status        string `json:"status"`
}

// ParseMarkdown extracts candidate rows from category-grouped Markdown tables.
// It deliberately marks every result discovery-only; it does not establish official provenance.
func ParseMarkdown(markdown, directoryURL, revision string) ([]Candidate, error) {
	if !immutableRevision.MatchString(revision) {
		return nil, fmt.Errorf("source revision must be a full 40-character commit SHA")
	}
	directory, err := url.Parse(strings.TrimSpace(directoryURL))
	if err != nil || directory.Scheme != "https" || directory.Host == "" || directory.User != nil {
		return nil, fmt.Errorf("directory URL must be a valid HTTPS URL without credentials")
	}

	var candidates []Candidate
	seen := make(map[string]struct{})
	category := ""
	for _, raw := range strings.Split(markdown, "\n") {
		line := strings.TrimSpace(raw)
		if strings.HasPrefix(line, "#") {
			category = strings.TrimSpace(strings.TrimLeft(line, "#"))
			continue
		}
		if !strings.HasPrefix(line, "|") || strings.Contains(line, "---") {
			continue
		}
		cells := strings.Split(strings.Trim(line, "|"), "|")
		if len(cells) < 2 {
			continue
		}
		first := strings.TrimSpace(cells[0])
		second := strings.TrimSpace(cells[1])
		match := markdownLink.FindStringSubmatch(first)
		if len(match) != 3 {
			continue
		}
		name := strings.TrimSpace(match[1])
		description := strings.TrimSpace(second)
		if name == "" || description == "" {
			return nil, fmt.Errorf("candidate name and description must not be blank")
		}
		parsed, err := url.Parse(strings.TrimSpace(match[2]))
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil {
			return nil, fmt.Errorf("candidate %q must use an HTTPS URL without credentials", name)
		}
		key := strings.ToLower(parsed.Hostname()) + "|" + strings.TrimRight(parsed.EscapedPath(), "/")
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		candidates = append(candidates, Candidate{
			Name: name, Description: description, URL: parsed.String(),
			Category: category, DirectoryURL: directory.String(),
			SourceRevision: strings.ToLower(revision), Status: "DISCOVERY_ONLY",
		})
	}
	return candidates, nil
}
