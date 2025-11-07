package db

import (
	"context"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func RunSeeds(ctx context.Context) error {
	email := "demo@example.com"
	password := "demo123"

	var exists bool
	err := Pool.QueryRow(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
		email,
	).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check if user exists: %w", err)
	}

	if exists {
		return nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	_, err = Pool.Exec(
		ctx,
		"INSERT INTO users (email, password) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
		email,
		string(hashedPassword),
	)
	if err != nil {
		return fmt.Errorf("failed to seed user: %w", err)
	}

	return nil
}
