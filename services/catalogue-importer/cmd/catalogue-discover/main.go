package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/discovery"
)

func main() {
	input := flag.String("input", "", "local upstream directory README markdown")
	output := flag.String("output", "-", "JSON output path, or - for stdout")
	directoryURL := flag.String("directory-url", "https://github.com/public-apis/public-apis", "upstream directory URL")
	revision := flag.String("revision", "", "full immutable upstream commit SHA")
	flag.Parse()
	if *input == "" || *revision == "" {
		fatalf("-input and -revision are required")
	}
	data, err := os.ReadFile(*input)
	if err != nil {
		fatalf("read input: %v", err)
	}
	candidates, err := discovery.ParseMarkdown(string(data), *directoryURL, *revision)
	if err != nil {
		fatalf("parse directory: %v", err)
	}
	report := struct {
		GeneratedAt time.Time             `json:"generatedAt"`
		Total       int                   `json:"total"`
		Notice      string                `json:"notice"`
		Candidates  []discovery.Candidate `json:"candidates"`
	}{
		GeneratedAt: time.Now().UTC(),
		Total:       len(candidates),
		Notice:      "Discovery leads only. Independently verify official provider sources, rights, terms, pricing, authentication, availability, and duplicates. Never import or publish this file directly.",
		Candidates:  candidates,
	}
	encoded, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fatalf("encode report: %v", err)
	}
	if *output == "-" {
		fmt.Println(string(encoded))
		return
	}
	if err := os.WriteFile(*output, encoded, 0644); err != nil {
		fatalf("write output: %v", err)
	}
	fmt.Printf("Wrote %d discovery leads to %s; no APIVault records were changed.\n", len(candidates), *output)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
