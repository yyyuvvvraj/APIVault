package evidence

import (
	"bytes"
	"encoding/json"
	"io"
	"net/url"
	"strings"
)

type OpenAPIAnalysis struct {
	Format              string   `json:"format"`
	Title               string   `json:"title"`
	Version             string   `json:"version"`
	PathCount           int      `json:"pathCount"`
	SecureServerURLs    []string `json:"secureServerUrls"`
	ProviderDomainMatch bool     `json:"providerDomainMatch"`
	Valid               bool     `json:"valid"`
	Issues              []string `json:"issues"`
	Notice              string   `json:"notice"`
}

// AnalyzeOpenAPIJSON performs offline structural checks on a supplied JSON
// OpenAPI/Swagger document. It never fetches URLs or treats a valid contract as
// proof of provider ownership, endpoint availability, or permission to publish.
func AnalyzeOpenAPIJSON(raw []byte, providerDomains []string) OpenAPIAnalysis {
	result := OpenAPIAnalysis{
		Issues:           []string{},
		SecureServerURLs: []string{},
		Notice:            "Offline contract structure only. A valid result does not authenticate the provider, prove endpoint health, assess terms, or approve, verify, import, or publish an API.",
	}
	if len(raw) == 0 || len(raw) > 5*1024*1024 {
		result.Issues = append(result.Issues, "document must be between 1 byte and 5 MiB")
		return result
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var document map[string]any
	if err := decoder.Decode(&document); err != nil || document == nil {
		result.Issues = append(result.Issues, "document must be a JSON object")
		return result
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		result.Issues = append(result.Issues, "document must contain exactly one valid JSON value")
		return result
	}
	info, _ := document["info"].(map[string]any)
	result.Title, result.Version = stringValue(info["title"]), stringValue(info["version"])
	if result.Title == "" {
		result.Issues = append(result.Issues, "info.title is required")
	}
	if result.Version == "" {
		result.Issues = append(result.Issues, "info.version is required")
	}
	paths, _ := document["paths"].(map[string]any)
	result.PathCount = len(paths)
	if result.PathCount == 0 {
		result.Issues = append(result.Issues, "at least one API path is required")
	}

	if version := stringValue(document["openapi"]); strings.HasPrefix(version, "3.") {
		result.Format = "OPENAPI_3"
		servers, _ := document["servers"].([]any)
		for _, rawServer := range servers {
			server, _ := rawServer.(map[string]any)
			if value := stringValue(server["url"]); value != "" && safeProviderServer(value, providerDomains) {
				result.SecureServerURLs = append(result.SecureServerURLs, value)
			}
		}
	} else if stringValue(document["swagger"]) == "2.0" {
		result.Format = "SWAGGER_2"
		host := stringValue(document["host"])
		schemes, _ := document["schemes"].([]any)
		hasHTTPS := false
		for _, scheme := range schemes {
			if strings.EqualFold(stringValue(scheme), "https") {
				hasHTTPS = true
			}
		}
		if host != "" && hasHTTPS {
			server := "https://" + host + stringValue(document["basePath"])
			if safeProviderServer(server, providerDomains) {
				result.SecureServerURLs = append(result.SecureServerURLs, server)
			}
		}
	} else {
		result.Issues = append(result.Issues, "document must declare OpenAPI 3.x or Swagger 2.0")
	}
	result.ProviderDomainMatch = len(result.SecureServerURLs) > 0
	if !result.ProviderDomainMatch {
		result.Issues = append(result.Issues, "no HTTPS API server matches a declared provider domain")
	}
	result.Valid = len(result.Issues) == 0
	return result
}

func stringValue(value any) string {
	text, _ := value.(string)
	return strings.TrimSpace(text)
}

func safeProviderServer(raw string, domains []string) bool {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil || parsed.Opaque != "" {
		return false
	}
	host := strings.ToLower(strings.TrimSuffix(parsed.Hostname(), "."))
	for _, candidate := range domains {
		domain := strings.ToLower(strings.TrimSuffix(strings.TrimSpace(candidate), "."))
		if domain != "" && (host == domain || strings.HasSuffix(host, "."+domain)) {
			return true
		}
	}
	return false
}
