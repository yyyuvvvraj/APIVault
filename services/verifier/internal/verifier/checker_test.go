package verifier

import (
	"net"
	"net/url"
	"testing"
)

func TestValidateTargetRejectsUnsafeURLs(t *testing.T) {
	cases := []string{
		"file:///etc/passwd",
		"ftp://example.com/file",
		"http://127.0.0.1",
		"http://10.0.0.5",
		"http://169.254.169.254/latest/meta-data",
		"http://user:pass@example.com",
		"https://example.com:8443",
		"http://example.com:443",
		"http://[::1]/",
	}
	for _, raw := range cases {
		t.Run(raw, func(t *testing.T) {
			if _, err := validateTarget(raw); err == nil {
				t.Fatalf("expected %q to be rejected", raw)
			}
		})
	}
}

func TestValidateTargetAcceptsPublicHTTPURL(t *testing.T) {
	parsed, err := validateTarget("https://example.com/docs")
	if err != nil {
		t.Fatalf("expected public HTTPS URL to pass syntax validation: %v", err)
	}
	if parsed.Hostname() != "example.com" {
		t.Fatalf("unexpected hostname: %s", parsed.Hostname())
	}
}

func TestPublicIPBlocksPrivateAndReservedRanges(t *testing.T) {
	blocked := []string{"10.0.0.1", "192.168.1.1", "100.64.0.1", "192.0.2.1", "2001:db8::1"}
	for _, raw := range blocked {
		if publicIP(net.ParseIP(raw)) {
			t.Errorf("expected %s to be blocked", raw)
		}
	}
	if !publicIP(net.ParseIP("1.1.1.1")) {
		t.Fatal("expected public IPv4 address to be allowed")
	}
}

func TestURLHasNoCredentials(t *testing.T) {
	parsed, _ := url.Parse("https://example.com")
	if parsed.User != nil {
		t.Fatal("fixture unexpectedly contains credentials")
	}
}
