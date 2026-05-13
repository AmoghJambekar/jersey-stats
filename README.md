# JerseyStats

NBA team and player stats filtered by **jersey colorway**.

## Repository layout

```text
jersey-stats/
├── cmd/server/          # Go API entrypoint (Chi + Postgres later)
├── internal/            # Handlers, config, DB wiring (not committed as empty structure only)
├── db/
│   ├── migrations/      # Postgres schema (e.g. golang-migrate / goose)
│   └── queries/         # sqlc SQL → generated Go
├── docs/
│   └── PRODUCT_SPEC.md  # One-page product spec
├── frontend/            # Next.js + Tailwind (placeholder; see frontend/README.md)
├── go.mod
└── README.md
```

Run the API stub:

```bash
go run ./cmd/server
```

## Stack (target)

| Layer | Choice |
|-------|--------|
| API | Go, Chi |
| DB | Postgres, sqlc |
| Web | Next.js + Tailwind (under `frontend/`) |
| Hosting | API: Railway or Render; DB: Supabase; Web: Vercel |
