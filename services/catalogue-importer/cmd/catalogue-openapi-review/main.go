package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/evidence"
)

func main() {
	inputPath := flag.String("input", "", "local OpenAPI/Swagger JSON document")
	domainsFlag := flag.String("provider-domains", "", "comma-separated provider-controlled domains")
	outputPath := flag.String("output", "-", "analysis report path, or - for stdout")
	flag.Parse()
	if *inputPath == "" || strings.TrimSpace(*domainsFlag) == "" {
		fatalf("-input and -provider-domains are required")
	}
	raw, err := os.ReadFile(*inputPath)
	if err != nil { fatalf("read OpenAPI document: %v", err) }
	result := evidence.AnalyzeOpenAPIJSON(raw, strings.Split(*domainsFlag, ","))
	encoded, err := json.MarshalIndent(result, "", "  ")
	if err != nil { fatalf("encode analysis: %v", err) }
	if *outputPath == "-" {
		fmt.Println(string(encoded))
	} else if err := os.WriteFile(*outputPath, encoded, 0644); err != nil {
		fatalf("write analysis: %v", err)
	}
	if !result.Valid { os.Exit(1) }
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(2)
}
