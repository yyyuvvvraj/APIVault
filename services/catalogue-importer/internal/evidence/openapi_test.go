package evidence

import (
	"encoding/json"
	"testing"
)

func TestAnalyzeOpenAPIJSONAcceptsHTTPSProviderServer(t *testing.T) {
	document := map[string]any{
		"openapi": "3.1.0",
		"info":    map[string]any{"title": "Example API", "version": "v1"},
		"servers": []any{map[string]any{"url": "https://api.example.com/v1"}},
		"paths":   map[string]any{"/items": map[string]any{"get": map[string]any{"summary": "List items"}}},
	}
	raw, _ := json.Marshal(document)
	result := AnalyzeOpenAPIJSON(raw, []string{"example.com"})
	if !result.Valid || result.Format != "OPENAPI_3" || result.PathCount != 1 || !result.ProviderDomainMatch {
		t.Fatalf("expected valid provider contract, got %+v", result)
	}
}

func TestAnalyzeOpenAPIJSONRejectsUntrustedOrInsecureServers(t *testing.T) {
	for _, server := range []string{"http://api.example.com", "https://example.com.attacker.invalid", "https://user:pass@example.com"} {
		t.Run(server, func(t *testing.T) {
			raw := []byte(`{"openapi":"3.0.0","info":{"title":"API","version":"1"},"servers":[{"url":"` + server + `"}],"paths":{"/x":{"get":{}}}}`)
			result := AnalyzeOpenAPIJSON(raw, []string{"example.com"})
			if result.Valid || result.ProviderDomainMatch {
				t.Fatalf("expected server to fail closed, got %+v", result)
			}
		})
	}
}

func TestAnalyzeOpenAPIJSONSupportsSwaggerV2HTTPS(t *testing.T) {
	raw := []byte(`{"swagger":"2.0","info":{"title":"Legacy API","version":"1"},"host":"api.example.com","basePath":"/v1","schemes":["https"],"paths":{"/items":{"get":{}}}}`)
	result := AnalyzeOpenAPIJSON(raw, []string{"example.com"})
	if !result.Valid || result.Format != "SWAGGER_2" {
		t.Fatalf("expected valid Swagger 2 contract, got %+v", result)
	}
}

func TestAnalyzeOpenAPIJSONRequiresPathsAndMetadata(t *testing.T) {
	raw := []byte(`{"openapi":"3.0.0","info":{},"servers":[{"url":"https://api.example.com"}],"paths":{}}`)
	result := AnalyzeOpenAPIJSON(raw, []string{"example.com"})
	if result.Valid || result.PathCount != 0 || len(result.Issues) < 2 {
		t.Fatalf("expected missing metadata and paths to be blocked, got %+v", result)
	}
}

func TestAnalyzeOpenAPIJSONRejectsMalformedAndOversizedDocuments(t *testing.T) {
	if AnalyzeOpenAPIJSON([]byte("not json"), []string{"example.com"}).Valid {
		t.Fatal("malformed JSON must be rejected")
	}
	if AnalyzeOpenAPIJSON(make([]byte, 5*1024*1024+1), []string{"example.com"}).Valid {
		t.Fatal("oversized document must be rejected")
	}
}
