package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/curation"
	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/evidence"
)

func main() {
	inputPath := flag.String("input", "", "provider evidence pack JSON")
	outputPath := flag.String("output", "-", "curation handoff report path, or - for stdout")
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

	result := curation.Build(pack)
	for _, draft := range result.Drafts {
		if err := draft.ValidateHandoff(); err != nil {
			fatalf("invalid curation handoff for review %q: %v", draft.ReviewID, err)
		}
	}
	encoded, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fatalf("encode curation handoff: %v", err)
	}
	if *outputPath == "-" {
		fmt.Println(string(encoded))
	} else if err := os.WriteFile(*outputPath, encoded, 0644); err != nil {
		fatalf("write curation handoff: %v", err)
	}
	fmt.Fprintf(os.Stderr, "Curation handoff: %d drafts, %d evidence-ready, %d blocked. All drafts remain non-importable; no database writes or publication occurred.\n",
		len(result.Drafts), result.Ready, result.Blocked)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
