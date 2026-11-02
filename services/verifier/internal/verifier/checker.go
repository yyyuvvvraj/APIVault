package verifier

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Result struct {
	APIID       string `json:"apiId"`
	IsReachable bool   `json:"isReachable"`
	StatusCode  *int   `json:"statusCode"`
	LatencyMs   int64  `json:"latencyMs"`
	ErrorMessage *string `json:"errorMessage"`
}

func publicIP(ip net.IP) bool {
	addr, ok := netip.AddrFromSlice(ip)
	if !ok {
		return false
	}
	addr = addr.Unmap()
	if !addr.IsGlobalUnicast() || addr.IsPrivate() || addr.IsLoopback() || addr.IsLinkLocalUnicast() || addr.IsMulticast() || addr.IsUnspecified() {
		return false
	}
	blocked := []string{
		"0.0.0.0/8", "100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24",
		"198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "192.88.99.0/24", "192.31.196.0/24", "192.52.193.0/24", "192.175.48.0/24", "240.0.0.0/4",
		"2001:db8::/32", "2001::/23", "2002::/16",
	}
	for _, raw := range blocked {
		prefix := netip.MustParsePrefix(raw)
		if prefix.Contains(addr) {
			return false
		}
	}
	return true
}

func validateTarget(raw string) (*url.URL, error) {
	parsed, err := url.ParseRequestURI(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, errors.New("only HTTP and HTTPS URLs are supported")
	}
	if parsed.Hostname() == "" || parsed.User != nil {
		return nil, errors.New("URL must contain a hostname and must not include credentials")
	}
	if port := parsed.Port(); port != "" {
		value, err := strconv.Atoi(port)
		if err != nil || value < 1 || value > 65535 {
			return nil, errors.New("invalid URL port")
		}
		if (parsed.Scheme == "http" && value != 80) || (parsed.Scheme == "https" && value != 443) {
			return nil, errors.New("only standard HTTP and HTTPS ports are allowed")
		}
	}
	if ip := net.ParseIP(parsed.Hostname()); ip != nil && !publicIP(ip) {
		return nil, errors.New("target resolves to a non-public IP address")
	}
	return parsed, nil
}

func safeTransport() *http.Transport {
	dialer := &net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}
	return &http.Transport{
		Proxy: nil,
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(address)
			if err != nil {
				return nil, err
			}
			ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
			if err != nil {
				return nil, err
			}
			for _, ip := range ips {
				if !publicIP(ip) {
					return nil, errors.New("DNS target includes a non-public IP address")
				}
			}
			if len(ips) == 0 {
				return nil, errors.New("hostname did not resolve")
			}
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
		},
		TLSHandshakeTimeout: 5 * time.Second,
		ResponseHeaderTimeout: 7 * time.Second,
		IdleConnTimeout: 30 * time.Second,
	}
}

func Check(ctx context.Context, apiID, rawURL string) Result {
	result := Result{APIID: apiID}
	started := time.Now()
	parsed, err := validateTarget(rawURL)
	if err != nil {
		result.ErrorMessage = NormalizeError(err.Error())
		result.LatencyMs = time.Since(started).Milliseconds()
		return result
	}

	client := &http.Client{
		Transport: safeTransport(),
		Timeout: 10 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	defer client.CloseIdleConnections()
	request, err := http.NewRequestWithContext(ctx, http.MethodHead, parsed.String(), nil)
	if err != nil {
		result.ErrorMessage = NormalizeError(err.Error())
		result.LatencyMs = time.Since(started).Milliseconds()
		return result
	}
	request.Header.Set("User-Agent", "APIVault-Verifier/1.0")
	response, err := client.Do(request)
	if err == nil && (response.StatusCode == http.StatusMethodNotAllowed || response.StatusCode == http.StatusNotImplemented) {
		response.Body.Close()
		request, err = http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
		if err != nil {
			result.ErrorMessage = NormalizeError(err.Error())
			result.LatencyMs = time.Since(started).Milliseconds()
			return result
		}
		request.Header.Set("User-Agent", "APIVault-Verifier/1.0")
		request.Header.Set("Range", "bytes=0-0")
		response, err = client.Do(request)
	}
	if err != nil {
		result.ErrorMessage = NormalizeError(err.Error())
		result.LatencyMs = time.Since(started).Milliseconds()
		return result
	}
	defer response.Body.Close()

	status := response.StatusCode
	result.StatusCode = &status
	result.IsReachable = status < 500
	result.LatencyMs = time.Since(started).Milliseconds()
	if !result.IsReachable {
		result.ErrorMessage = NormalizeError(fmt.Sprintf("remote server returned HTTP %d", status))
	}
	return result
}

func NormalizeError(message string) *string {
	message = strings.TrimSpace(message)
	if message == "" {
		return nil
	}
	if len(message) > 500 {
		message = message[:500]
	}
	return &message
}
