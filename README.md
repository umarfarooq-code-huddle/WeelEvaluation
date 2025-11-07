# Weel Evaluation

Full-stack monorepo application with Go backend, React frontend, and PostgreSQL database.

## Project Structure

```
.
├── backend/          # Go API server
│   ├── cmd/server/  # Application entry point
│   ├── internal/    # Internal packages (auth, orders, db, etc.)
│   └── pkg/         # Public packages (validation, etc.)
├── frontend/        # React application
│   └── src/         # Source code (pages, components, hooks, context, api)
├── db/              # Database migrations and seeds
│   ├── migrations/  # SQL migration files
│   └── seeds/       # Seed data files
└── docker-compose.yml
```

## Prerequisites

- Docker and Docker Compose
- Go 1.21+ (for local backend development)
- Node.js 18+ (for local frontend development)

## Quick Start

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Start all services:
   ```bash
   docker-compose up -d
   ```

3. Start individual services:
   ```bash
   docker-compose up postgres      # Database only
   docker-compose up backend       # Backend + database
   docker-compose up frontend     # Frontend + backend + database
   ```

## Services

- **Postgres**: Database server on port 5432
- **Backend**: Go API server on port 8080
- **Frontend**: React application on port 3000

## Development

### Backend
```bash
cd backend
go run cmd/server/main.go
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Environment Variables

See `.env.example` for all available configuration options.

