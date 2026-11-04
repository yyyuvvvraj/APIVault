package catalogue

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"
)

type URLCheck struct {
	URL        string `json:"url"`
	StatusCode int    `json:"statusCode,omitempty"`
	Reachable  bool   `json:"reachable"`
	LatencyMS  int64  `json:"latencyMs"`
	Error      string `json:"error,omitempty"`
}

type APIValidation struct {
	Slug          string     `json:"slug"`
	HomepageURL   string     `json:"homepageUrl"`
	Name          string     `json:"name"`
	Provider      string     `json:"provider"`
	Verdict       string     `json:"verdict"`
	Checks        []URLCheck `json:"checks"`
	DuplicateOf   string     `json:"duplicateOf,omitempty"`
	ReviewReasons []string   `json:"reviewReasons,omitempty"`
}

type CatalogueConflict struct {
	Kind               string `json:"kind"`
	APISlug            string `json:"apiSlug"`
	ConflictingAPISlug string `json:"conflictingApiSlug"`
	Key                string `json:"key"`
	Severity           string `json:"severity"`
}

type ValidationReport struct {
	GeneratedAt         time.Time           `json:"generatedAt"`
	Total               int                 `json:"total"`
	ValidatedCandidates int                 `json:"validatedCandidates"`
	ReviewRequired      int                 `json:"reviewRequired"`
	Rejected            int                 `json:"rejected"`
	Results             []APIValidation     `json:"results"`
	Conflicts           []CatalogueConflict `json:"conflicts"`
}

// ValidateLive checks public HTTPS evidence URLs. A clean result is a candidate
// for review, never an automatic VERIFIED or published record.
func ValidateLive(ctx context.Context, file File, workers int, timeout time.Duration) ValidationReport {
	if workers < 1 {
		workers = 8
	}
	if workers > 20 {
		workers = 20
	}
	if timeout <= 0 {
		timeout = 8 * time.Second
	}

	report := ValidationReport{
		GeneratedAt: time.Now().UTC(),
		Total:       len(file.APIs),
		Results:     make([]APIValidation, len(file.APIs)),
	}
	type task struct {
		index int
		api   API
	}
	tasks := make(chan task)
	var wg sync.WaitGroup
	client := &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			DialContext: dialPublicContext,
			TLSHandshakeTimeout: timeout,
			ResponseHeaderTimeout: timeout,
			IdleConnTimeout: 30 * time.Second,
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return fmt.Errorf("too many redirects")
			}
			if req.URL.Scheme != "https" {
				return fmt.Errorf("redirect left HTTPS")
			}
			return ensurePublicHost(req.Context(), req.URL.Hostname())
		},
	}
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for item := range tasks {
				api := item.api
				result := APIValidation{
					Slug:        api.Slug,
					HomepageURL: api.HomepageURL,
					Name:        api.Name,
					Provider:    api.Provider.Name,
					Verdict:     "VALIDATED_CANDIDATE",
				}
				urls := []string{api.HomepageURL}
				if api.DocumentationURL != "" {
					urls = append(urls, api.DocumentationURL)
				}
				for _, source := range api.Sources {
					urls = append(urls, source.URL)
				}
				seen := map[string]bool{}
				for _, raw := range urls {
					if seen[raw] {
						continue
					}
					seen[raw] = true
					check := checkPublicURL(ctx, client, raw)
					result.Checks = append(result.Checks, check)
					if !check.Reachable {
						result.ReviewReasons = append(result.ReviewReasons, raw+": "+check.Error)
					}
				}
				hasOfficialEvidence := false
				for _, source := range api.Sources {
					if source.IsOfficial && (source.Kind == "OFFICIAL_HOMEPAGE" || source.Kind == "DOCUMENTATION") {
						hasOfficialEvidence = true
					}
				}
				if !hasOfficialEvidence {
					result.ReviewReasons = append(result.ReviewReasons, "missing official homepage or documentation evidence")
				}
				if len(result.ReviewReasons) > 0 {
					result.Verdict = "REVIEW_REQUIRED"
				}
				report.Results[item.index] = result
			}
		}()
	}
	for i, api := range file.APIs {
		tasks <- task{index: i, api: api}
	}
	close(tasks)
	wg.Wait()

	seenNames := make(map[string]string)
	seenHomepages := make(map[string]APIValidation)
	for i := range report.Results {
		result := &report.Results[i]
		nameKey := strings.ToLower(strings.Join(strings.Fields(result.Provider+" "+result.Name), " "))
		if prior, ok := seenNames[nameKey]; ok {
			result.DuplicateOf = prior
			result.Verdict = "REVIEW_REQUIRED"
			result.ReviewReasons = append(result.ReviewReasons, "possible duplicate of "+prior)
			report.Conflicts = append(report.Conflicts, CatalogueConflict{
				Kind:               "PROVIDER_NAME_DUPLICATE",
				APISlug:            result.Slug,
				ConflictingAPISlug: prior,
				Key:                nameKey,
				Severity:           "HIGH",
			})
		} else {
			seenNames[nameKey] = result.Slug
		}
		if homepageKey, err := canonicalHomepage(result.HomepageURL); err == nil {
			if prior, ok := seenHomepages[homepageKey]; ok && !strings.EqualFold(prior.Provider, result.Provider) {
				result.Verdict = "REVIEW_REQUIRED"
				result.ReviewReasons = append(result.ReviewReasons, "homepage also referenced by provider "+prior.Provider+" ("+prior.Slug+")")
				report.Conflicts = append(report.Conflicts, CatalogueConflict{
					Kind: "CROSS_PROVIDER_HOMEPAGE_COLLISION", APISlug: result.Slug,
					ConflictingAPISlug: prior.Slug, Key: homepageKey, Severity: "MEDIUM",
				})
			} else {
				seenHomepages[homepageKey] = *result
			}
		}
		switch result.Verdict {
		case "VALIDATED_CANDIDATE":
			report.ValidatedCandidates++
		case "REJECTED":
			report.Rejected++
		default:
			report.ReviewRequired++
		}
		sort.Strings(result.ReviewReasons)
	}
	return report
}

func canonicalHomepage(raw string) (string, error) {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" {
		return "", fmt.Errorf("invalid HTTPS homepage")
	}
	host := strings.ToLower(strings.TrimPrefix(parsed.Hostname(), "www."))
	path := strings.TrimRight(parsed.EscapedPath(), "/")
	if path == "" {
		path = "/"
	}
	return host + path, nil
}

func checkPublicURL(ctx context.Context, client *http.Client, raw string) URLCheck {
	check := URLCheck{URL: raw}
	parsed, err := url.ParseRequestURI(raw)
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil {
		check.Error = "not a valid absolute HTTPS URL"
		return check
	}
	if err := ensurePublicHost(ctx, parsed.Hostname()); err != nil {
		check.Error = err.Error()
		return check
	}
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, raw, nil)
	if err != nil {
		check.Error = err.Error()
		return check
	}
	req.Header.Set("User-Agent", "APIVault-Catalogue-Validator/1.0")
	req.Header.Set("Range", "bytes=0-0")
	resp, err := client.Do(req)
	check.LatencyMS = time.Since(start).Milliseconds()
	if err != nil {
		check.Error = err.Error()
		return check
	}
	defer resp.Body.Close()
	check.StatusCode = resp.StatusCode
	_, _ = io.CopyN(io.Discard, resp.Body, 4096)
	check.Reachable = resp.StatusCode >= 200 && resp.StatusCode < 400
	if !check.Reachable {
		check.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
	}
	return check
}

// dialPublicContext pins each connection to a DNS result after rejecting private
// and special-use addresses. This prevents a second DNS lookup from rebinding an
// otherwise public evidence hostname to an internal service.
func dialPublicContext(ctx context.Context, network, address string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, fmt.Errorf("invalid destination address: %w", err)
	}
	var ips []net.IPAddr
	if parsed := net.ParseIP(host); parsed != nil {
		ips = []net.IPAddr{{IP: parsed}}
	} else {
		ips, err = net.DefaultResolver.LookupIPAddr(ctx, host)
		if err != nil {
			return nil, fmt.Errorf("DNS lookup failed: %w", err)
		}
	}
	if len(ips) == 0 {
		return nil, fmt.Errorf("DNS returned no addresses")
	}
	for _, entry := range ips {
		if !isPublicIP(entry.IP) {
			return nil, fmt.Errorf("host resolves to a non-public IP address")
		}
	}
	dialer := &net.Dialer{Timeout: 8 * time.Second, KeepAlive: 30 * time.Second}
	var lastErr error
	for _, entry := range ips {
		conn, dialErr := dialer.DialContext(ctx, network, net.JoinHostPort(entry.IP.String(), port))
		if dialErr == nil {
			return conn, nil
		}
		lastErr = dialErr
	}
	return nil, fmt.Errorf("could not connect to public DNS addresses: %w", lastErr)
}

func ensurePublicHost(ctx context.Context, host string) error {
	if ip := net.ParseIP(host); ip != nil {
		if !isPublicIP(ip) {
			return fmt.Errorf("host resolves to a non-public IP address")
		}
		return nil
	}
	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return fmt.Errorf("DNS lookup failed: %w", err)
	}
	if len(ips) == 0 {
		return fmt.Errorf("DNS returned no addresses")
	}
	for _, entry := range ips {
		if !isPublicIP(entry.IP) {
			return fmt.Errorf("host resolves to a non-public IP address")
		}
	}
	return nil
}

func isPublicIP(ip net.IP) bool {
	return ip != nil && !ip.IsPrivate() && !ip.IsLoopback() && !ip.IsLinkLocalUnicast() &&
		!ip.IsLinkLocalMulticast() && !ip.IsMulticast() && !ip.IsUnspecified()
}
