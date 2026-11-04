package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yyyuvvvraj/apivault/services/catalogue-importer/internal/catalogue"
)

func main() {
	inputPath := flag.String("input", "", "path to a catalogue JSON file")
	apply := flag.Bool("apply", false, "write validated records to PostgreSQL; without this flag the command is a dry run")
	runID := flag.String("run-id", "", "stable import run ID; reuse it to resume a failed import")
	batchSize := flag.Int("batch-size", 100, "records per transaction (1-250)")
	flag.Parse()

	if *inputPath == "" {
		fmt.Fprintln(os.Stderr, "usage: catalogue-importer -input path/to/catalogue.json [-apply]")
		os.Exit(2)
	}

	fileHandle, err := os.Open(*inputPath)
	if err != nil {
		fatalf("open input: %v", err)
	}
	defer fileHandle.Close()

	file, err := catalogue.Decode(fileHandle)
	if err != nil {
		fatalf("%v", err)
	}
	file = file.Normalize()
	if err := file.Validate(); err != nil {
		fatalf("catalogue validation failed: %v", err)
	}

	if !*apply {
		fmt.Printf("Dry run successful: validated %d API record(s). No database connection or writes were made.\n", len(file.APIs))
		fmt.Println("Review the input, then pass -apply to import in resumable batches.")
		return
	}

	databaseURL := os.Getenv("DATABASE_URL_UNPOOLED")
	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		fatalf("DATABASE_URL_UNPOOLED or DATABASE_URL is required when -apply is used")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		fatalf("parse DATABASE_URL: %v", err)
	}
	config.MaxConns = 2
	config.MinConns = 0

	fmt.Printf("Connecting to PostgreSQL host %s (database %s).\n", config.ConnConfig.Host, config.ConnConfig.Database)
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		fatalf("connect to PostgreSQL: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		fatalf("PostgreSQL health check failed: %v", err)
	}
	if err := catalogue.Import(ctx, pool, file); err != nil {
		fatalf("catalogue import failed; transaction rolled back: %v", err)
	}

	fmt.Printf("Import successful: %d API record(s) processed transactionally.\n", len(file.APIs))
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
