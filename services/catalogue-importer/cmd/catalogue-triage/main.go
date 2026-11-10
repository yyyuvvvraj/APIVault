package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/triage"
)

func main() {
	inputPath := flag.String("input", "", "discovery leads JSON report")
	outputPath := flag.String("output", "-", "triage report path, or - for stdout")
	flag.Parse()
	if *inputPath == "" {
		fatalf("-input is required")
	}
	input, err := os.Open(*inputPath)
	if err != nil {
		fatalf("open discovery report: %v", err)
	}
	defer input.Close()

	var discovery triage.DiscoveryReport
	decoder := json.NewDecoder(input)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&discovery); err != nil {
		fatalf("decode discovery report: %v", err)
	}
	report, err := triage.Build(discovery)
	if err != nil {
		fatalf("triage discovery report: %v", err)
	}
	encoded, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fatalf("encode triage report: %v", err)
	}
	if *outputPath == "-" {
		fmt.Println(string(encoded))
		return
	}
	if err := os.WriteFile(*outputPath, encoded, 0644); err != nil {
		fatalf("write triage report: %v", err)
	}
	fmt.Printf("Triage report written to %s: %d review-only leads, %d rejected, %d unmapped categories. No database writes occurred.\n",
		*outputPath, report.Processed, report.Rejected, report.UnmappedCategory)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
