package db

import (
	"context"
	"fmt"
)

func RunMigrations(ctx context.Context) error {
	createUsersTableSQL := `
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`

	if _, err := Pool.Exec(ctx, createUsersTableSQL); err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	createOrdersTableSQL := `
		CREATE TABLE IF NOT EXISTS orders (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			type VARCHAR(20) NOT NULL CHECK (type IN ('IN_STORE', 'DELIVERY', 'CURBSIDE')),
			datetime TIMESTAMP NOT NULL,
			notes TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`

	if _, err := Pool.Exec(ctx, createOrdersTableSQL); err != nil {
		return fmt.Errorf("failed to create orders table: %w", err)
	}

	return nil
}
