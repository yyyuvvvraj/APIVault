package catalogue

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ImportOptions struct {
	RunID     string
	BatchSize int
}

func normalizeBatchSize(size int) (int, error) {
	if size == 0 {
		return 100, nil
	}
	if size < 1 || size > 250 {
		return 0, fmt.Errorf("batch size must be between 1 and 250")
	}
	return size, nil
}

type ImportReport struct {
	RunID            string `json:"runId"`
	TotalRecords     int    `json:"totalRecords"`
	ProcessedRecords int    `json:"processedRecords"`
	SkippedBatches   int    `json:"skippedBatches"`
	CompletedBatches int    `json:"completedBatches"`
	BatchSize        int    `json:"batchSize"`
	DatasetName      string `json:"datasetName"`
}

// ImportResumable commits each bounded batch and its checkpoint atomically.
// Reuse RunID with the same input and batch size to resume after a failure.
func ImportResumable(ctx context.Context, pool *pgxpool.Pool, file File, options ImportOptions) (ImportReport, error) {
	file = file.Normalize()
	if err := file.Validate(); err != nil {
		return ImportReport{}, err
	}
	if err := file.Dataset.Validate(); err != nil {
		return ImportReport{}, fmt.Errorf("dataset provenance: %w", err)
	}
	retrievedAt, _ := time.Parse(time.RFC3339, file.Dataset.RetrievedAt)
	batchSize, err := normalizeBatchSize(options.BatchSize)
	if err != nil {
		return ImportReport{}, err
	}
	options.BatchSize = batchSize
	if options.RunID == "" {
		id, err := newUUID()
		if err != nil {
			return ImportReport{}, err
		}
		options.RunID = id
	}
	if len(options.RunID) > 80 {
		return ImportReport{}, fmt.Errorf("run ID must be at most 80 characters")
	}

	input, err := json.Marshal(file)
	if err != nil {
		return ImportReport{}, fmt.Errorf("fingerprint input: %w", err)
	}
	sum := sha256.Sum256(input)
	fingerprint := hex.EncodeToString(sum[:])
	now := time.Now().UTC()
	_, err = pool.Exec(ctx, `INSERT INTO "CatalogueImportRun" ("id","inputFingerprint","totalRecords","batchSize","status","datasetName","datasetSourceUrl","datasetVersion","retrievedAt","license","attribution","createdAt","updatedAt") VALUES ($1,$2,$3,$4,'RUNNING',$5,$6,$7,$8,$9,$10,$11,$11) ON CONFLICT ("id") DO NOTHING`, options.RunID, fingerprint, len(file.APIs), options.BatchSize, file.Dataset.Name, file.Dataset.SourceURL, file.Dataset.Version, retrievedAt, file.Dataset.License, file.Dataset.Attribution, now)
	if err != nil {
		return ImportReport{}, fmt.Errorf("create import run: %w", err)
	}

	var storedFingerprint, status string
	var total, batchSize int
	err = pool.QueryRow(ctx, `SELECT "inputFingerprint","totalRecords","batchSize","status" FROM "CatalogueImportRun" WHERE "id"=$1`, options.RunID).Scan(&storedFingerprint, &total, &batchSize, &status)
	if err != nil {
		return ImportReport{}, fmt.Errorf("read import run: %w", err)
	}
	if storedFingerprint != fingerprint || total != len(file.APIs) || batchSize != options.BatchSize {
		return ImportReport{}, fmt.Errorf("run ID %q is already associated with different input or batch size", options.RunID)
	}
	report := ImportReport{RunID: options.RunID, TotalRecords: len(file.APIs), BatchSize: options.BatchSize, DatasetName: file.Dataset.Name}
	if status == "COMPLETED" {
		report.ProcessedRecords = len(file.APIs)
		return report, nil
	}
	if _, err := pool.Exec(ctx, `UPDATE "CatalogueImportRun" SET "status"='RUNNING',"errorSummary"=NULL,"updatedAt"=$2 WHERE "id"=$1`, options.RunID, time.Now().UTC()); err != nil {
		return report, fmt.Errorf("mark import run running: %w", err)
	}

	batchCount := (len(file.APIs) + options.BatchSize - 1) / options.BatchSize
	for batch := 0; batch < batchCount; batch++ {
		start, end := batch*options.BatchSize, (batch+1)*options.BatchSize
		if end > len(file.APIs) {
			end = len(file.APIs)
		}
		var completed bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM "CatalogueImportBatch" WHERE "runId"=$1 AND "batchNumber"=$2 AND "status"='COMPLETED')`, options.RunID, batch).Scan(&completed); err != nil {
			return report, fmt.Errorf("read batch checkpoint %d: %w", batch, err)
		}
		if completed {
			report.SkippedBatches++
			report.ProcessedRecords += end - start
			continue
		}

		tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
		if err != nil {
			return report, fmt.Errorf("begin batch %d: %w", batch, err)
		}
		batchID, idErr := newUUID()
		if idErr == nil {
			_, err = tx.Exec(ctx, `INSERT INTO "CatalogueImportBatch" ("id","runId","batchNumber","recordCount","status","startedAt") VALUES ($1::uuid,$2,$3,$4,'RUNNING',$5) ON CONFLICT ("runId","batchNumber") DO UPDATE SET "recordCount"=EXCLUDED."recordCount","status"='RUNNING',"startedAt"=EXCLUDED."startedAt',"completedAt"=NULL,"errorSummary"=NULL`, batchID, options.RunID, batch, end-start, time.Now().UTC())
		} else {
			err = idErr
		}
		if err == nil {
			for index, api := range file.APIs[start:end] {
				if err = importAPI(ctx, tx, api, time.Now().UTC()); err != nil {
					err = fmt.Errorf("API %q at input record %d: %w", api.Slug, start+index+1, err)
					break
				}
			}
		}
		if err == nil {
			_, err = tx.Exec(ctx, `UPDATE "CatalogueImportBatch" SET "status"='COMPLETED',"processedCount"="recordCount","completedAt"=$3 WHERE "runId"=$1 AND "batchNumber"=$2`, options.RunID, batch, time.Now().UTC())
		}
		if err == nil {
			_, err = tx.Exec(ctx, `UPDATE "CatalogueImportRun" SET "processedRecords"=(SELECT COALESCE(SUM("processedCount"),0) FROM "CatalogueImportBatch" WHERE "runId"=$1 AND "status"='COMPLETED'),"updatedAt"=$2 WHERE "id"=$1`, options.RunID, time.Now().UTC())
		}
		if err != nil {
			_ = tx.Rollback(context.Background())
			if _, statusErr := pool.Exec(ctx, `UPDATE "CatalogueImportRun" SET "status"='FAILED',"errorSummary"=$2,"updatedAt"=$3 WHERE "id"=$1`, options.RunID, err.Error(), time.Now().UTC()); statusErr != nil {
				return report, fmt.Errorf("batch %d failed (%v); could not mark run failed: %w", batch, err, statusErr)
			}
			return report, fmt.Errorf("batch %d failed; retry with the same run ID: %w", batch, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return report, fmt.Errorf("commit batch %d; retry with the same run ID: %w", batch, err)
		}
		report.CompletedBatches++
		report.ProcessedRecords += end - start
	}
	_, err = pool.Exec(ctx, `UPDATE "CatalogueImportRun" SET "status"='COMPLETED',"completedAt"=$2,"updatedAt"=$2,"errorSummary"=NULL WHERE "id"=$1`, options.RunID, time.Now().UTC())
	if err != nil {
		return report, fmt.Errorf("complete import run: %w", err)
	}
	return report, nil
}
