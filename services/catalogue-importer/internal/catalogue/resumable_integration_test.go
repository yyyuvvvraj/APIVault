package catalogue

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// This test runs against the migrated, disposable PostgreSQL database used by
// Application CI. It intentionally skips in environments without a test URL.
func TestImportResumablePostgresRecoveryAndConcurrency(t *testing.T) {
	databaseURL := os.Getenv("APIVAULT_TEST_DATABASE_URL")
	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		t.Skip("set APIVAULT_TEST_DATABASE_URL to a migrated disposable PostgreSQL database")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatalf("parse test database URL: %v", err)
	}
	config.MaxConns = 8
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("ping test database: %v", err)
	}

	id, err := newUUID()
	if err != nil {
		t.Fatalf("generate test fixture ID: %v", err)
	}
	suffix := strings.ReplaceAll(id, "-", "")
	categorySlug := "it-category-" + suffix
	providerSlug := "it-provider-" + suffix
	runID := "it-" + suffix
	firstSlug := "it-api-one-" + suffix
	secondSlug := "it-api-two-" + suffix
	failureCategorySlug := "it-missing-category-" + suffix
	failureSlug := "it-api-failure-" + suffix
	failureRunID := "it-failure-" + suffix

	defer func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cleanupCancel()
		_, _ = pool.Exec(cleanupCtx, `DELETE FROM "Api" WHERE "slug" IN ($1, $2, $3)`, firstSlug, secondSlug, failureSlug)
		_, _ = pool.Exec(cleanupCtx, `DELETE FROM "ApiProvider" WHERE "slug"=$1`, providerSlug)
		_, _ = pool.Exec(cleanupCtx, `DELETE FROM "Category" WHERE "slug" IN ($1, $2)`, categorySlug, failureCategorySlug)
		_, _ = pool.Exec(cleanupCtx, `DELETE FROM "CatalogueImportRun" WHERE "id" IN ($1, $2)`, runID, failureRunID)
	}()

	now := time.Now().UTC()
	categoryID, err := newUUID()
	if err != nil {
		t.Fatalf("generate category ID: %v", err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO "Category" ("id", "slug", "name", "createdAt", "updatedAt")
		VALUES ($1::uuid, $2, $3, $4, $4)
	`, categoryID, categorySlug, "Importer integration test", now)
	if err != nil {
		t.Fatalf("create test category: %v", err)
	}

	file := File{
		Dataset: DatasetProvenance{
			Name:        "APIVault importer integration fixture",
			SourceURL:   "https://example.org/apivault-integration-fixture",
			Version:     "test-v1",
			RetrievedAt: now.Format(time.RFC3339),
			License:     "NOASSERTION",
			Attribution: "APIVault automated integration test",
		},
		APIs: []API{
			integrationAPI(firstSlug, "First integration API", providerSlug, categorySlug, suffix),
			integrationAPI(secondSlug, "Second integration API", providerSlug, categorySlug, suffix),
		},
	}

	options := ImportOptions{RunID: runID, BatchSize: 1}
	start := make(chan struct{})
	errs := make(chan error, 2)
	var workers sync.WaitGroup
	for i := 0; i < 2; i++ {
		workers.Add(1)
		go func() {
			defer workers.Done()
			<-start
			_, importErr := ImportResumable(ctx, pool, file, options)
			errs <- importErr
		}()
	}
	close(start)
	workers.Wait()
	close(errs)
	for importErr := range errs {
		if importErr != nil {
			t.Fatalf("concurrent import with the same run ID failed: %v", importErr)
		}
	}

	assertRevisionCount := func(slug string, want int) {
		t.Helper()
		var count int
		err := pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM "ApiRevision" r
			JOIN "Api" a ON a."id" = r."apiId"
			WHERE a."slug" = $1
		`, slug).Scan(&count)
		if err != nil {
			t.Fatalf("count revisions for %s: %v", slug, err)
		}
		if count != want {
			t.Fatalf("expected %d revisions for %s, got %d", want, slug, count)
		}
	}
	assertRevisionCount(firstSlug, 1)
	assertRevisionCount(secondSlug, 1)

	// Model a process interruption after batch zero committed: retain its
	// checkpoint, remove batch one's checkpoint, and mark the run failed.
	// The second API is removed to prove that the resumed batch is re-applied.
	if _, err := pool.Exec(ctx, `DELETE FROM "Api" WHERE "slug"=$1`, secondSlug); err != nil {
		t.Fatalf("remove second API to model interrupted batch: %v", err)
	}
	if _, err := pool.Exec(ctx, `DELETE FROM "CatalogueImportBatch" WHERE "runId"=$1 AND "batchNumber"=1`, runID); err != nil {
		t.Fatalf("remove incomplete batch checkpoint: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		UPDATE "CatalogueImportRun"
		SET "status"='FAILED', "processedRecords"=1, "completedAt"=NULL
		WHERE "id"=$1
	`, runID); err != nil {
		t.Fatalf("mark run interrupted: %v", err)
	}

	report, err := ImportResumable(ctx, pool, file, options)
	if err != nil {
		t.Fatalf("resume interrupted import: %v", err)
	}
	if report.SkippedBatches != 1 || report.CompletedBatches != 1 || report.ProcessedRecords != 2 {
		t.Fatalf("unexpected resume report: %+v", report)
	}
	assertRevisionCount(firstSlug, 1)
	assertRevisionCount(secondSlug, 1)

	var status string
	if err := pool.QueryRow(ctx, `SELECT "status" FROM "CatalogueImportRun" WHERE "id"=$1`, runID).Scan(&status); err != nil {
		t.Fatalf("read final import status: %v", err)
	}
	if status != "COMPLETED" {
		t.Fatalf("expected completed run after recovery, got %q", status)
	}
}

	// A database-side failure rolls back the batch transaction. Its diagnostic
	// must nevertheless survive outside that transaction so operators can see
	// which batch failed, and the same run ID must recover after the cause is fixed.
	failureFile := file
	failureFile.APIs = []API{
		integrationAPI(failureSlug, "Failure recovery integration API", providerSlug, failureCategorySlug, suffix),
	}
	failureOptions := ImportOptions{RunID: failureRunID, BatchSize: 1}
	if _, err := ImportResumable(ctx, pool, failureFile, failureOptions); err == nil {
		t.Fatal("expected import to fail while its category is missing")
	}

	var failedRunStatus, runError string
	if err := pool.QueryRow(ctx, `SELECT "status", COALESCE("errorSummary",'') FROM "CatalogueImportRun" WHERE "id"=$1`, failureRunID).Scan(&failedRunStatus, &runError); err != nil {
		t.Fatalf("read failed import run: %v", err)
	}
	if failedRunStatus != "FAILED" || !strings.Contains(runError, failureCategorySlug) {
		t.Fatalf("unexpected failed run diagnostics: status=%q error=%q", failedRunStatus, runError)
	}

	var failedBatchStatus, batchError string
	var failedBatchProcessed int
	if err := pool.QueryRow(ctx, `SELECT "status", COALESCE("errorSummary",''), "processedCount" FROM "CatalogueImportBatch" WHERE "runId"=$1 AND "batchNumber"=0`, failureRunID).Scan(&failedBatchStatus, &batchError, &failedBatchProcessed); err != nil {
		t.Fatalf("read failed batch diagnostics: %v", err)
	}
	if failedBatchStatus != "FAILED" || !strings.Contains(batchError, failureCategorySlug) || failedBatchProcessed != 0 {
		t.Fatalf("unexpected failed batch diagnostics: status=%q error=%q processed=%d", failedBatchStatus, batchError, failedBatchProcessed)
	}

	failureCategoryID, err := newUUID()
	if err != nil {
		t.Fatalf("generate recovery category ID: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO "Category" ("id","slug","name","createdAt","updatedAt")
		VALUES ($1::uuid,$2,$3,$4,$4)
	`, failureCategoryID, failureCategorySlug, "Importer failure recovery category", time.Now().UTC()); err != nil {
		t.Fatalf("create missing category for retry: %v", err)
	}

	failureReport, err := ImportResumable(ctx, pool, failureFile, failureOptions)
	if err != nil {
		t.Fatalf("retry failed batch with same run ID: %v", err)
	}
	if failureReport.CompletedBatches != 1 || failureReport.ProcessedRecords != 1 {
		t.Fatalf("unexpected failed-batch recovery report: %+v", failureReport)
	}
	var recoveredBatchStatus, recoveredBatchError string
	var recoveredBatchProcessed int
	if err := pool.QueryRow(ctx, `SELECT "status", COALESCE("errorSummary",''), "processedCount" FROM "CatalogueImportBatch" WHERE "runId"=$1 AND "batchNumber"=0`, failureRunID).Scan(&recoveredBatchStatus, &recoveredBatchError, &recoveredBatchProcessed); err != nil {
		t.Fatalf("read recovered batch checkpoint: %v", err)
	}
	if recoveredBatchStatus != "COMPLETED" || recoveredBatchError != "" || recoveredBatchProcessed != 1 {
		t.Fatalf("failed batch diagnostics were not cleared on recovery: status=%q error=%q processed=%d", recoveredBatchStatus, recoveredBatchError, recoveredBatchProcessed)
	}
	var recoveredRunStatus string
	if err := pool.QueryRow(ctx, `SELECT "status" FROM "CatalogueImportRun" WHERE "id"=$1`, failureRunID).Scan(&recoveredRunStatus); err != nil {
		t.Fatalf("read recovered run status: %v", err)
	}
	if recoveredRunStatus != "COMPLETED" {
		t.Fatalf("expected recovered run to complete, got %q", recoveredRunStatus)
	}


func integrationAPI(slug, name, providerSlug, categorySlug, suffix string) API {
	return API{
		Slug:        slug,
		Name:        name,
		Summary:     "Disposable PostgreSQL importer integration fixture",
		Provider:    Provider{Slug: providerSlug, Name: "Importer Integration Provider"},
		HomepageURL: "https://example.org/" + slug,
		Categories:  []string{categorySlug},
		Sources: []Source{{
			Kind:       "OFFICIAL_HOMEPAGE",
			URL:        fmt.Sprintf("https://example.org/source/%s/%s", suffix, slug),
			Title:      "Integration fixture source",
			IsOfficial: true,
		}},
	}
}
