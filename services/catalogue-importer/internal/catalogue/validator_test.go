package catalogue

import (
	"net"
	"testing"
)

func TestIsPublicIP(t *testing.T) {
	cases := []struct { value string; want bool }{
		{"8.8.8.8", true},
		{"127.0.0.1", false},
		{"10.0.0.1", false},
		{"169.254.1.1", false},
		{"::1", false},
		{"2001:4860:4860::8888", true},
	}
	for _, tc := range cases {
		t.Run(tc.value, func(t *testing.T) {
			if got := isPublicIP(net.ParseIP(tc.value)); got != tc.want {
				t.Fatalf("isPublicIP(%s) = %v, want %v", tc.value, got, tc.want)
			}
		})
	}
}
