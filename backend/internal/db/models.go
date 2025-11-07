package db

import "time"

type User struct {
	ID        int       `db:"id"`
	Email     string    `db:"email"`
	Password  string    `db:"password"`
	CreatedAt time.Time `db:"created_at"`
}

type Order struct {
	ID       int       `db:"id"`
	UserID   int       `db:"user_id"`
	Type     string    `db:"type"`
	DateTime time.Time `db:"datetime"`
	Notes    string    `db:"notes"`
}
