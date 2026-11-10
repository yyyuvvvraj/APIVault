package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/evidence"
)

func main() {
	inputPath := flag.String("input", "", "provider evidence pack JSON")
	outputPath := flag.String("output", "-", "validation report path, or - for stdout")
	flag.Parse()

	if *inputPath == "" {
		fatalf("-input is required")
	}
	input, err := os.Open(*inputPath)
	if err != nil {
		fatalf("open evidence pack: %v", err)
	}
	defer input.Close()

	var pack evidence.Pack
	decoder := json.NewDecoder(input)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&pack); err != nil {
		fatalf("decode evidence pack: %v", err)
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		fatalf("evidence pack must contain exactly one JSON value")
	}

	report := evidence.Validate(pack)
	encoded, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		fatalf("encode validation report: %v", err)
	}
	if *outputPath == "-" {
		fmt.Println(string(encoded))
	} else if err := os.WriteFile(*outputPath, encoded, 0644); err != nil {
		fatalf("write validation report: %v", err)
	}
	fmt.Fprintf(os.Stderr, "Evidence review: %d ready for maintainer review, %d blocked, %d total. No database writes or publication occurred.\n",
		report.Ready, report.Blocked, report.Total)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
