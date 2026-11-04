package catalogue

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"regexp"
	"strings"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type File struct {
	APIs []API `json:"apis"`
}

type API struct {
	Slug               string       `json:"slug"`
	Name               string       `json:"name"`
	Summary            string       `json:"summary"`
	Description        string       `json:"description,omitempty"`
	Provider           Provider     `json:"provider"`
	HomepageURL        string       `json:"homepageUrl"`
	DocumentationURL   string       `json:"documentationUrl,omitempty"`
	BaseURL            string       `json:"baseUrl,omitempty"`
	PricingModel       string       `json:"pricingModel,omitempty"`
	PricingSummary     string       `json:"pricingSummary,omitempty"`
	Status             string       `json:"status,omitempty"`
	VerificationStatus string       `json:"verificationStatus,omitempty"`
	Featured           bool         `json:"featured,omitempty"`
	Categories         []string     `json:"categories"`
	AuthMethods        []AuthMethod `json:"authMethods,omitempty"`
	Sources            []Source     `json:"sources"`
}

type Provider struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	HomepageURL string `json:"homepageUrl,omitempty"`
}

type AuthMethod struct {
	Method  string `json:"method"`
	Details string `json:"details,omitempty"`
}

type Source struct {
	Kind       string `json:"kind"`
	URL        string `json:"url"`
	Title      string `json:"title,omitempty"`
	IsOfficial bool   `json:"isOfficial"`
	Notes      string `json:"notes,omitempty"`
}

var pricingModels = valueSet("FREE", "FREEMIUM", "PAID", "OPEN_SOURCE", "UNKNOWN")
var apiStatuses = valueSet("ACTIVE", "DEPRECATED", "UNAVAILABLE", "ARCHIVED")
var verificationStatuses = valueSet("UNVERIFIED", "PENDING_REVIEW", "STALE")
var supportedAuthMethods = valueSet("API_KEY", "OAUTH2", "BEARER_TOKEN", "BASIC_AUTH", "NONE", "CUSTOM", "UNKNOWN")
var sourceKinds = valueSet("OFFICIAL_HOMEPAGE", "DOCUMENTATION", "PRICING", "AUTHENTICATION", "RATE_LIMITS", "TERMS", "STATUS", "OTHER")

func valueSet(values ...string) map[string]struct{} {
	result := make(map[string]struct{}, len(values))
	for _, value := range values {
		result[value] = struct{}{}
	}
	return result
}

func Decode(reader io.Reader) (File, error) {
	const maxInputBytes = 64 << 20
	raw, err := io.ReadAll(io.LimitReader(reader, maxInputBytes+1))
	if err != nil {
		return File{}, fmt.Errorf("read catalogue JSON: %w", err)
	}
	if len(raw) > maxInputBytes {
		return File{}, fmt.Errorf("catalogue JSON exceeds the 64 MiB input limit")
	}

	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()

	var file File
	if err := decoder.Decode(&file); err != nil {
		return File{}, fmt.Errorf("decode catalogue JSON: %w", err)
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		if err == nil {
			return File{}, fmt.Errorf("catalogue JSON must contain exactly one top-level value")
		}
		return File{}, fmt.Errorf("read trailing catalogue data: %w", err)
	}
	return file, nil
}

func (file File) Validate() error {
	if len(file.APIs) == 0 {
		return fmt.Errorf("catalogue must contain at least one API")
	}
	if len(file.APIs) > 10000 {
		return fmt.Errorf("catalogue contains %d APIs; maximum is 10,000 per manifest", len(file.APIs))
	}

	seenSlugs := make(map[string]struct{}, len(file.APIs))
	for index, api := range file.APIs {
		prefix := fmt.Sprintf("apis[%d]", index)
		if err := validateAPI(api, prefix); err != nil {
			return err
		}
		if _, exists := seenSlugs[api.Slug]; exists {
			return fmt.Errorf("%s.slug %q is duplicated in this file", prefix, api.Slug)
		}
		seenSlugs[api.Slug] = struct{}{}
	}
	return nil
}

func validateAPI(api API, prefix string) error {
	if !validSlug(api.Slug) {
		return fmt.Errorf("%s.slug must be a lowercase hyphenated slug", prefix)
	}
	if err := required(api.Name, 180, prefix+".name"); err != nil {
		return err
	}
	if err := required(api.Summary, 280, prefix+".summary"); err != nil {
		return err
	}
	if err := validateProvider(api.Provider, prefix+".provider"); err != nil {
		return err
	}
	if err := httpsURL(api.HomepageURL, prefix+".homepageUrl", true); err != nil {
		return err
	}
	if err := httpsURL(api.DocumentationURL, prefix+".documentationUrl", false); err != nil {
		return err
	}
	if err := httpsURL(api.BaseURL, prefix+".baseUrl", false); err != nil {
		return err
	}

	if api.PricingModel != "" {
		if _, ok := pricingModels[api.PricingModel]; !ok {
			return fmt.Errorf("%s.pricingModel %q is not supported", prefix, api.PricingModel)
		}
	}
	if api.Status != "" {
		if _, ok := apiStatuses[api.Status]; !ok {
			return fmt.Errorf("%s.status %q is not supported", prefix, api.Status)
		}
	}
	if api.VerificationStatus != "" {
		if _, ok := verificationStatuses[api.VerificationStatus]; !ok {
			return fmt.Errorf("%s.verificationStatus %q is not allowed; imports cannot mark records VERIFIED", prefix, api.VerificationStatus)
		}
	}
	if api.Featured {
		return fmt.Errorf("%s.featured cannot be true for imported, unverified records", prefix)
	}

	if len(api.Categories) == 0 {
		return fmt.Errorf("%s.categories must contain at least one existing category slug", prefix)
	}
	seenCategories := make(map[string]struct{}, len(api.Categories))
	for _, category := range api.Categories {
		if !validSlug(category) {
			return fmt.Errorf("%s.categories contains invalid slug %q", prefix, category)
		}
		if _, exists := seenCategories[category]; exists {
			return fmt.Errorf("%s.categories contains duplicate slug %q", prefix, category)
		}
		seenCategories[category] = struct{}{}
	}

	seenAuth := make(map[string]struct{}, len(api.AuthMethods))
	for _, method := range api.AuthMethods {
		if _, ok := supportedAuthMethods[method.Method]; !ok {
			return fmt.Errorf("%s.authMethods contains unsupported method %q", prefix, method.Method)
		}
		if _, exists := seenAuth[method.Method]; exists {
			return fmt.Errorf("%s.authMethods contains duplicate method %q", prefix, method.Method)
		}
		seenAuth[method.Method] = struct{}{}
	}

	if len(api.Sources) == 0 {
		return fmt.Errorf("%s.sources must include at least one source URL", prefix)
	}
	seenSources := make(map[string]struct{}, len(api.Sources))
	for sourceIndex, source := range api.Sources {
		sourcePrefix := fmt.Sprintf("%s.sources[%d]", prefix, sourceIndex)
		if _, ok := sourceKinds[source.Kind]; !ok {
			return fmt.Errorf("%s.kind %q is not supported", sourcePrefix, source.Kind)
		}
		if err := httpsURL(source.URL, sourcePrefix+".url", true); err != nil {
			return err
		}
		if _, exists := seenSources[source.URL]; exists {
			return fmt.Errorf("%s.url %q is duplicated", sourcePrefix, source.URL)
		}
		seenSources[source.URL] = struct{}{}
		if len([]rune(source.Title)) > 240 {
			return fmt.Errorf("%s.title exceeds 240 characters", sourcePrefix)
		}
	}
	return nil
}

func validateProvider(provider Provider, prefix string) error {
	if !validSlug(provider.Slug) {
		return fmt.Errorf("%s.slug must be a lowercase hyphenated slug", prefix)
	}
	if err := required(provider.Name, 160, prefix+".name"); err != nil {
		return err
	}
	return httpsURL(provider.HomepageURL, prefix+".homepageUrl", false)
}

func required(value string, max int, field string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return fmt.Errorf("%s is required", field)
	}
	if len([]rune(value)) > max {
		return fmt.Errorf("%s exceeds %d characters", field, max)
	}
	return nil
}

func validSlug(value string) bool {
	return len(value) <= 120 && slugPattern.MatchString(value)
}

func httpsURL(value, field string, required bool) error {
	value = strings.TrimSpace(value)
	if value == "" && !required {
		return nil
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil {
		return fmt.Errorf("%s must be an absolute HTTPS URL without embedded credentials", field)
	}
	return nil
}

func (api API) Normalized() API {
	api.Slug = strings.TrimSpace(api.Slug)
	api.Name = strings.TrimSpace(api.Name)
	api.Summary = strings.TrimSpace(api.Summary)
	api.Description = strings.TrimSpace(api.Description)
	api.Provider.Slug = strings.TrimSpace(api.Provider.Slug)
	api.Provider.Name = strings.TrimSpace(api.Provider.Name)
	api.Provider.Description = strings.TrimSpace(api.Provider.Description)
	api.HomepageURL = strings.TrimSpace(api.HomepageURL)
	api.DocumentationURL = strings.TrimSpace(api.DocumentationURL)
	api.BaseURL = strings.TrimSpace(api.BaseURL)
	api.PricingSummary = strings.TrimSpace(api.PricingSummary)
	api.PricingModel = defaultValue(api.PricingModel, "UNKNOWN")
	api.Status = defaultValue(api.Status, "ACTIVE")
	api.VerificationStatus = defaultValue(api.VerificationStatus, "UNVERIFIED")
	for i := range api.Categories {
		api.Categories[i] = strings.TrimSpace(api.Categories[i])
	}
	for i := range api.AuthMethods {
		api.AuthMethods[i].Method = strings.TrimSpace(api.AuthMethods[i].Method)
		api.AuthMethods[i].Details = strings.TrimSpace(api.AuthMethods[i].Details)
	}
	for i := range api.Sources {
		api.Sources[i].Kind = strings.TrimSpace(api.Sources[i].Kind)
		api.Sources[i].URL = strings.TrimSpace(api.Sources[i].URL)
		api.Sources[i].Title = strings.TrimSpace(api.Sources[i].Title)
		api.Sources[i].Notes = strings.TrimSpace(api.Sources[i].Notes)
	}
	return api
}

func defaultValue(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func (file File) Normalize() File {
	normalized := File{APIs: make([]API, len(file.APIs))}
	for i, api := range file.APIs {
		normalized.APIs[i] = api.Normalized()
	}
	return normalized
}
