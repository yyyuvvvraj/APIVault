package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/catalogue"
)

func main() {
	input := flag.String("input", "", "catalogue JSON manifest")
	output := flag.String("output", "-", "report path, or - for stdout")
	live := flag.Bool("live", true, "check HTTPS evidence reachability (disable for offline schema-only validation)")
	workers := flag.Int("workers", 8, "concurrent URL checks (maximum 20)")
	timeout := flag.Duration("timeout", 8*time.Second, "timeout per URL check")
	flag.Parse()
	if *input == "" { fatalf("-input is required") }

	f, err := os.Open(*input)
	if err != nil { fatalf("open manifest: %v", err) }
	defer f.Close()
	file, err := catalogue.Decode(f)
	if err != nil { fatalf("decode manifest: %v", err) }
	file = file.Normalize()
	if err := file.Validate(); err != nil { fatalf("schema validation failed: %v", err) }

	var report catalogue.ValidationReport
	if *live {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		report = catalogue.ValidateLive(ctx, file, *workers, *timeout)
	} else {
		report = catalogue.ValidationReport{GeneratedAt: time.Now().UTC(), Total: len(file.APIs)}
		for _, api := range file.APIs {
			report.Results = append(report.Results, catalogue.APIValidation{Slug: api.Slug, Name: api.Name, Provider: api.Provider.Name, Verdict: "REVIEW_REQUIRED", ReviewReasons: []string{"live checks disabled; static validation only"}})
			report.ReviewRequired++
		}
	}
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil { fatalf("encode report: %v", err) }
	if *output == "-" { fmt.Println(string(data)); return }
	if err := os.WriteFile(*output, data, 0644); err != nil { fatalf("write report: %v", err) }
	fmt.Printf("Validation report written to %s: %d candidates, %d require review, %d rejected\n", *output, report.ValidatedCandidates, report.ReviewRequired, report.Rejected)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
