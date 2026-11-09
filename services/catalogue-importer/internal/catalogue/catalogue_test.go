package catalogue

import (
	"os"
	"strings"
	"testing"
)

func validFile() File {
	return File{APIs: []API{{
		Slug:        "sample-api",
		Name:        "Sample API",
		Summary:     "A sample API used by importer tests.",
		Provider:    Provider{Slug: "sample-provider", Name: "Sample Provider", HomepageURL: "https://provider.example.com"},
		HomepageURL: "https://api.example.com",
		Categories:  []string{"developer-tools"},
		AuthMethods: []AuthMethod{{Method: "API_KEY"}},
		Sources:     []Source{{Kind: "DOCUMENTATION", URL: "https://api.example.com/docs", IsOfficial: true}},
	}}}
}

func TestValidateAcceptsPendingCatalogueRecord(t *testing.T) {
	file := validFile()
	file.APIs[0].VerificationStatus = "PENDING_REVIEW"
	if err := file.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
}

func TestValidateRejectsVerifiedStatus(t *testing.T) {
	file := validFile()
	file.APIs[0].VerificationStatus = "VERIFIED"
	if err := file.Validate(); err == nil {
		t.Fatal("Validate() accepted VERIFIED status")
	}
}

func TestValidateRejectsInsecureSourceURL(t *testing.T) {
	file := validFile()
	file.APIs[0].Sources[0].URL = "http://api.example.com/docs"
	if err := file.Validate(); err == nil {
		t.Fatal("Validate() accepted an HTTP source URL")
	}
}

func TestValidateRejectsDuplicateSlugs(t *testing.T) {
	file := validFile()
	file.APIs = append(file.APIs, file.APIs[0])
	if err := file.Validate(); err == nil {
		t.Fatal("Validate() accepted duplicate API slugs")
	}
}

func TestDecodeRejectsUnknownFields(t *testing.T) {
	_, err := Decode(strings.NewReader(`{"apis":[],"unexpected":true}`))
	if err == nil {
		t.Fatal("Decode() accepted an unknown field")
	}
}

func TestNormalizeAppliesSafeDefaults(t *testing.T) {
	file := validFile().Normalize()
	api := file.APIs[0]
	if api.PricingModel != "UNKNOWN" || api.Status != "ACTIVE" || api.VerificationStatus != "UNVERIFIED" {
		t.Fatalf("unexpected defaults: pricing=%s status=%s verification=%s", api.PricingModel, api.Status, api.VerificationStatus)
	}
}

func TestValidateRejectsFeaturedImport(t *testing.T) {
	file := validFile()
	file.APIs[0].Featured = true
	if err := file.Validate(); err == nil {
		t.Fatal("Validate() accepted a featured, unverified import")
	}
}

func TestCuratedStarterV2DatasetValidatesWithoutPublishing(t *testing.T) {
	input, err := os.Open("../../data/curated-starter-v2.json")
	if err != nil {
		t.Fatalf("open v2 dataset: %v", err)
	}
	defer input.Close()

	file, err := Decode(input)
	if err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if len(file.APIs) != 8 {
		t.Fatalf("expected 8 curated candidates, got %d", len(file.APIs))
	}
	if err := file.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
	for _, api := range file.APIs {
		if api.VerificationStatus != "PENDING_REVIEW" {
			t.Fatalf("candidate %q is not pending review", api.Slug)
		}
		if api.Featured {
			t.Fatalf("candidate %q must not be featured", api.Slug)
		}
	}
}

func TestDatasetProvenanceValidate(t *testing.T) {
	valid := DatasetProvenance{
		Name:        "Starter catalogue",
		SourceURL:   "https://example.org/catalogue.json",
		Version:     "v1",
		RetrievedAt: "2026-11-04T00:00:00Z",
		License:     "NOASSERTION",
		Attribution: "APIVault curation; see provider sources",
	}
	if err := valid.Validate(); err != nil {
		t.Fatalf("valid provenance rejected: %v", err)
	}
	invalid := valid
	invalid.RetrievedAt = "yesterday"
	if err := invalid.Validate(); err == nil {
		t.Fatal("expected invalid retrieval timestamp to be rejected")
	}
	invalid = valid
	invalid.SourceURL = "http://example.org/catalogue.json"
	if err := invalid.Validate(); err == nil {
		t.Fatal("expected non-HTTPS dataset source to be rejected")
	}
}

func TestNormalizeBatchSize(t *testing.T) {
	tests := []struct {
		name    string
		input   int
		want    int
		wantErr bool
	}{
		{name: "default", input: 0, want: 100},
		{name: "minimum", input: 1, want: 1},
		{name: "maximum", input: 250, want: 250},
		{name: "negative", input: -1, wantErr: true},
		{name: "too large", input: 251, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := normalizeBatchSize(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("normalizeBatchSize(%d) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
			if !tt.wantErr && got != tt.want {
				t.Fatalf("normalizeBatchSize(%d) = %d, want %d", tt.input, got, tt.want)
			}
		})
	}
}
