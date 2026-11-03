package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/yyyuvvvraj/apivault/services/verifier/internal/worker"
)

func main() {
	baseURL := strings.TrimRight(os.Getenv("API_BASE_URL"), "/")
	secret := os.Getenv("VERIFIER_SHARED_SECRET")
	if baseURL == "" || secret == "" || len(secret) < 32 {
		log.Fatal("API_BASE_URL and VERIFIER_SHARED_SECRET (at least 32 characters) are required")
	}

	interval := 30 * time.Minute
	if raw := os.Getenv("SCAN_INTERVAL"); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil || parsed < time.Minute {
			log.Fatal("SCAN_INTERVAL must be a valid duration of at least 1m")
		}
		interval = parsed
	}
	concurrency := 8
	if raw := os.Getenv("CONCURRENCY"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 32 {
			log.Fatal("CONCURRENCY must be between 1 and 32")
		}
		concurrency = parsed
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	client := worker.NewClient(baseURL, secret, concurrency)
	server := &http.Server{
		Addr:              ":8081",
		ReadHeaderTimeout: 5 * time.Second,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/healthz" || r.Method != http.MethodGet {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("ok"))
		}),
	}
	go func() {
		log.Printf("verifier health endpoint listening on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("health server stopped: %v", err)
			stop()
		}
	}()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		if err := client.Scan(ctx); err != nil && !errors.Is(err, context.Canceled) {
			log.Printf("verification scan failed: %v", err)
		}
		select {
		case <-ctx.Done():
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = server.Shutdown(shutdownCtx)
			return
		case <-ticker.C:
		}
	}
}
