package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/reviewpack"
	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/triage"
)

func main() {
	inputPath := flag.String("input", "", "triage JSON report")
	outputPath := flag.String("output", "-", "review pack path, or - for stdout")
	offset := flag.Int("offset", 0, "zero-based page offset")
	limit := flag.Int("limit", 100, "page size (1-500)")
	flag.Parse()

	if *inputPath == "" {
		fatalf("-input is required")
	}
	input, err := os.Open(*inputPath)
	if err != nil {
		fatalf("open triage report: %v", err)
	}
	defer input.Close()

	var triageReport triage.Report
	decoder := json.NewDecoder(input)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&triageReport); err != nil {
		fatalf("decode triage report: %v", err)
	}

	report, err := reviewpack.Build(triageReport, *offset, *limit)
	if err != nil {
		fatalf("build review pack: %v", err)
	}
	encoded, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fatalf("encode review pack: %v", err)
	}
	if *outputPath == "-" {
		fmt.Println(string(encoded))
		return
	}
	if err := os.WriteFile(*outputPath, encoded, 0644); err != nil {
		fatalf("write review pack: %v", err)
	}
	fmt.Printf(
		"Review pack written to %s: %d of %d discovery-only leads (offset %d); no database writes occurred.\n",
		*outputPath, report.Returned, report.SourceTotal, report.Offset,
	)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
