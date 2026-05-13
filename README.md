# JerseyStats

NBA team and player stats filtered by **jersey colorway** (manual LockerVision–backed assignments). Product decisions and v1 scope live in **[docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md)**.

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

## Toolchain (pinning versions)

**What “pin tool versions” means:** You record **exact** (or minimum) versions of tools and language runtimes the repo is tested with—Go, Node, `sqlc`, migration CLI—so a teammate or CI uses the **same** versions and you avoid “works on my machine” drift (different `sqlc` → different generated code, different Go → different stdlib behavior).

**How:** Put versions in `README` or a `Makefile` / `mise.toml` / `.tool-versions` (asdf) / `package.json` `engines` for Node; in CI, install those versions explicitly. This repo does not yet declare pins beyond `go` in `go.mod`; add Node and `sqlc` when the frontend and codegen land.

## Stack (target)

| Layer | Choice |
|-------|--------|
| API | Go, Chi |
| DB | Postgres, sqlc |
| Web | Next.js + Tailwind (under `frontend/`) |
| Hosting | API: Railway or Render; DB: Supabase; Web: Vercel |

## License

Proprietary — no public license file.
