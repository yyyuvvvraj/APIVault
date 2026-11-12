package catalogue

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const revisionActor = "apivault-go-importer"

func Import(ctx context.Context, pool *pgxpool.Pool, file File) error {
	file = file.Normalize()
	if err := file.Validate(); err != nil {
		return err
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin catalogue import transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(context.Background())
	}()

	now := time.Now().UTC()
	for index, api := range file.APIs {
		if err := importAPI(ctx, tx, api, now); err != nil {
			return fmt.Errorf("import API %q (record %d): %w", api.Slug, index+1, err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit catalogue import: %w", err)
	}
	return nil
}

func importAPI(ctx context.Context, tx pgx.Tx, api API, now time.Time) error {
	providerUUID, err := newUUID()
	if err != nil {
		return err
	}

	var providerID string
	err = tx.QueryRow(ctx, `
		INSERT INTO "ApiProvider"
			("id", "slug", "name", "description", "homepageUrl", "createdAt", "updatedAt")
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $6)
		ON CONFLICT ("slug") DO UPDATE SET
			"name" = EXCLUDED."name",
			"description" = EXCLUDED."description",
			"homepageUrl" = EXCLUDED."homepageUrl",
			"updatedAt" = EXCLUDED."updatedAt"
		RETURNING "id"::text
	`, providerUUID, api.Provider.Slug, api.Provider.Name, nullable(api.Provider.Description), nullable(api.Provider.HomepageURL), now).Scan(&providerID)
	if err != nil {
		return fmt.Errorf("upsert provider: %w", err)
	}

	snapshot, err := json.Marshal(api)
	if err != nil {
		return fmt.Errorf("encode revision snapshot: %w", err)
	}
	apiUUID, err := newUUID()
	if err != nil {
		return err
	}

	var apiID string
	var inserted bool
	err = tx.QueryRow(ctx, `
		INSERT INTO "Api"
			("id", "slug", "name", "summary", "description", "providerId",
			 "homepageUrl", "documentationUrl", "baseUrl", "pricingModel",
			 "pricingSummary", "status", "verificationStatus", "featured",
			 "createdAt", "updatedAt")
		VALUES
			($1::uuid, $2, $3, $4, $5, $6::uuid, $7, $8, $9,
			 $10::"PricingModel", $11, $12::"ApiStatus",
			 $13::"VerificationStatus", $14, $15, $15)
		ON CONFLICT ("slug") DO UPDATE SET
			"name" = EXCLUDED."name",
			"summary" = EXCLUDED."summary",
			"description" = EXCLUDED."description",
			"providerId" = EXCLUDED."providerId",
			"homepageUrl" = EXCLUDED."homepageUrl",
			"documentationUrl" = EXCLUDED."documentationUrl",
			"baseUrl" = EXCLUDED."baseUrl",
			"pricingModel" = EXCLUDED."pricingModel",
			"pricingSummary" = EXCLUDED."pricingSummary",
			"status" = CASE WHEN "Api"."verificationStatus" = 'VERIFIED'::"VerificationStatus" THEN "Api"."status" ELSE EXCLUDED."status" END,
			"verificationStatus" = CASE WHEN "Api"."verificationStatus" = 'VERIFIED'::"VerificationStatus" THEN "Api"."verificationStatus" ELSE EXCLUDED."verificationStatus" END,
			"featured" = CASE WHEN "Api"."verificationStatus" = 'VERIFIED'::"VerificationStatus" THEN "Api"."featured" ELSE EXCLUDED."featured" END,
			"updatedAt" = EXCLUDED."updatedAt"
		RETURNING "id"::text, (xmax = 0)
	`, apiUUID, api.Slug, api.Name, api.Summary, nullable(api.Description), providerID,
		api.HomepageURL, nullable(api.DocumentationURL), nullable(api.BaseURL),
		api.PricingModel, nullable(api.PricingSummary), api.Status, api.VerificationStatus,
		api.Featured, now).Scan(&apiID, &inserted)
	if err != nil {
		return fmt.Errorf("upsert API record: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM "ApiCategory" WHERE "apiId" = $1::uuid`, apiID); err != nil {
		return fmt.Errorf("replace API categories: %w", err)
	}
	for _, categorySlug := range api.Categories {
		var categoryID string
		if err := tx.QueryRow(ctx, `SELECT "id"::text FROM "Category" WHERE "slug" = $1`, categorySlug).Scan(&categoryID); err != nil {
			return fmt.Errorf("category %q does not exist (seed categories before importing): %w", categorySlug, err)
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO "ApiCategory" ("apiId", "categoryId")
			VALUES ($1::uuid, $2::uuid)
			ON CONFLICT DO NOTHING
		`, apiID, categoryID); err != nil {
			return fmt.Errorf("link category %q: %w", categorySlug, err)
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM "ApiAuthMethod" WHERE "apiId" = $1::uuid`, apiID); err != nil {
		return fmt.Errorf("replace authentication methods: %w", err)
	}
	for _, method := range api.AuthMethods {
		if _, err := tx.Exec(ctx, `
			INSERT INTO "ApiAuthMethod" ("apiId", "method", "details")
			VALUES ($1::uuid, $2::"AuthMethod", $3)
			ON CONFLICT ("apiId", "method") DO UPDATE SET "details" = EXCLUDED."details"
		`, apiID, method.Method, nullable(method.Details)); err != nil {
			return fmt.Errorf("insert authentication method %q: %w", method.Method, err)
		}
	}

	hasCanonicalHomepageEvidence := false
	for _, source := range api.Sources {
		if source.Kind == "OFFICIAL_HOMEPAGE" && source.IsOfficial && source.URL == api.HomepageURL {
			hasCanonicalHomepageEvidence = true
			break
		}
	}
	if hasCanonicalHomepageEvidence {
		if _, err := tx.Exec(ctx, `
			DELETE FROM "ApiSource"
			WHERE "apiId" = $1::uuid
			  AND "sourceKind" = 'OFFICIAL_HOMEPAGE'::"SourceKind"
			  AND "url" <> $2
		`, apiID, api.HomepageURL); err != nil {
			return fmt.Errorf("replace stale official homepage evidence: %w", err)
		}
	}

	for _, source := range api.Sources {
		sourceUUID, err := newUUID()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO "ApiSource"
				("id", "apiId", "sourceKind", "url", "title", "isOfficial", "notes", "createdAt")
			VALUES ($1::uuid, $2::uuid, $3::"SourceKind", $4, $5, $6, $7, $8)
			ON CONFLICT ("apiId", "url") DO UPDATE SET
				"sourceKind" = EXCLUDED."sourceKind",
				"title" = EXCLUDED."title",
				"isOfficial" = EXCLUDED."isOfficial",
				"notes" = EXCLUDED."notes"
		`, sourceUUID, apiID, source.Kind, source.URL, nullable(source.Title), source.IsOfficial, nullable(source.Notes), now); err != nil {
			return fmt.Errorf("upsert source %q: %w", source.URL, err)
		}
	}

	revisionUUID, err := newUUID()
	if err != nil {
		return err
	}
	action := "UPDATED"
	if inserted {
		action = "CREATED"
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO "ApiRevision"
			("id", "apiId", "action", "actorGithub", "summary", "snapshot", "createdAt")
		VALUES ($1::uuid, $2::uuid, $3::"RevisionAction", $4, $5, $6::jsonb, $7)
	`, revisionUUID, apiID, action, revisionActor, "Catalogue import via Go importer", string(snapshot), now); err != nil {
		return fmt.Errorf("write API revision: %w", err)
	}
	return nil
}

func nullable(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func newUUID() (string, error) {
	value := make([]byte, 16)
	if _, err := rand.Read(value); err != nil {
		return "", fmt.Errorf("generate UUID: %w", err)
	}
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		value[0:4], value[4:6], value[6:8], value[8:10], value[10:16]), nil
}
