package worker

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestScanUsesAuthenticatedJobsAndPersistsCheckResults(t *testing.T) {
	const secret = "test-secret-with-at-least-thirty-two-characters"
	var receivedResult map[string]any

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+secret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		switch {
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/internal/verifier/jobs"):
			_ = json.NewEncoder(w).Encode(jobsResponse{Jobs: []Job{{ID: "api-test-id", HomepageURL: "http://127.0.0.1"}}})
		case r.Method == http.MethodPost && r.URL.Path == "/api/internal/verifier/results":
			if err := json.NewDecoder(r.Body).Decode(&receivedResult); err != nil {
				http.Error(w, "bad json", http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusCreated)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := NewClient(server.URL, secret, 2)
	if err := client.Scan(context.Background()); err != nil {
		t.Fatalf("scan failed: %v", err)
	}
	if receivedResult["apiId"] != "api-test-id" {
		t.Fatalf("unexpected result payload: %#v", receivedResult)
	}
	if receivedResult["isReachable"] != false {
		t.Fatalf("private target must not be reported reachable: %#v", receivedResult)
	}
	if receivedResult["errorMessage"] == nil {
		t.Fatalf("expected SSRF protection reason in result: %#v", receivedResult)
	}
}

func TestScanRejectsUnauthorizedJobsEndpoint(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	}))
	defer server.Close()

	client := NewClient(server.URL, "another-secret-with-at-least-32-characters", 1)
	if err := client.Scan(context.Background()); err == nil {
		t.Fatal("expected unauthorized jobs request to fail")
	}
}
