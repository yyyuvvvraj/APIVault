package catalogue

import (
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
