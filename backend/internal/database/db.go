package database

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func Connect() {
	dsn := os.Getenv("DATABASE_URL")

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatal("unable to connect database:", err)
	}

	DB = pool
	log.Println("database connected")
}

// RunMigrations applies any pending *.sql files from the migrations directory.
// It tracks applied migrations in a schema_migrations table.
func RunMigrations(migrationsDir string) error {
	ctx := context.Background()

	// Ensure tracking table exists
	_, err := DB.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	// Collect applied migrations
	rows, err := DB.Query(ctx, `SELECT filename FROM schema_migrations`)
	if err != nil {
		return fmt.Errorf("query schema_migrations: %w", err)
	}
	applied := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			rows.Close()
			return err
		}
		applied[name] = true
	}
	rows.Close()

	// Collect migration files (only NNN_*.sql, not schema.sql)
	entries, err := filepath.Glob(filepath.Join(migrationsDir, "[0-9][0-9][0-9]_*.sql"))
	if err != nil {
		return fmt.Errorf("glob migrations: %w", err)
	}
	sort.Strings(entries)

	for _, path := range entries {
		name := filepath.Base(path)
		if applied[name] {
			continue
		}

		sql, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}

		if strings.TrimSpace(string(sql)) == "" {
			continue
		}

		tx, err := DB.Begin(ctx)
		if err != nil {
			return fmt.Errorf("begin tx for %s: %w", name, err)
		}

		_, execErr := tx.Exec(ctx, string(sql))
		if execErr != nil {
			tx.Rollback(ctx) //nolint:errcheck
			var pgErr *pgconn.PgError
			if errors.As(execErr, &pgErr) && strings.HasPrefix(pgErr.Code, "42") {
				// Object already exists — migration was applied before tracking began
				log.Printf("migration skipped (already applied): %s", name)
			} else {
				return fmt.Errorf("apply %s: %w", name, execErr)
			}
		} else {
			if err := tx.Commit(ctx); err != nil {
				return fmt.Errorf("commit %s: %w", name, err)
			}
			log.Printf("migration applied: %s", name)
		}

		if _, err := DB.Exec(ctx, `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, name); err != nil {
			return fmt.Errorf("record %s: %w", name, err)
		}
	}

	return nil
}
