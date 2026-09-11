# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`mcp_imoveis` is a Python **MCP server** (FastMCP v3, HTTP transport) exposing two tools:

- `buscar_imoveis` — queries a real-estate table in a **Supabase PostgreSQL** database.
- `consultar_faq` — ranks entries in a local `data/faq.json` against a natural-language question.

It is one independent project inside a larger multi-project repo (`../` — n8n + WhatsApp Cloud API (Meta) + Angular + Spring Boot). See `../AGENTS.md` for the wider picture. This directory has its own toolchain and its own `.env` (separate from the root `.env`).

## Commands

```bash
# Install (editable) — needed for both the server and app.py
pip install -e .

# Run the MCP server (HTTP transport, default :8000, endpoint /mcp)
python -m mcp_imoveis.server

# Run the Gradio test UI (:7860) — manual testing of both tools without an MCP client
pip install -r requirements.txt   # adds gradio on top of the editable install
python app.py

# Docker (reads ./.env, mounts ./data read-only)
docker compose up --build
```

There are **no tests, linter, or formatter configured** (despite cache dirs being listed in `.gitignore`). `requires-python` is `>=3.11`; the Dockerfile pins `python:3.12-slim`.

There is **no `.env.example`** in the tree even though `README.md` refers to one — copy the key list from `README.md` or the root `../.env`.

## Architecture

### Module layout and the circular-import dance

- `src/mcp_imoveis/server.py` — FastMCP app, tool definitions, DB connection helpers (`_build_conninfo`, `_get_connection`), `_json_safe` serialization, FAQ loading/scoring, `main()`.
- `src/mcp_imoveis/Imovel.py` — `Imovel` class holding the SQL query builder (`buscarImoveis`). It imports `_get_connection` / `_json_safe` **from `server.py`**.
- To avoid the cycle, `server.py`'s `buscar_imoveis` tool imports `Imovel` **lazily inside the function body**. Keep it that way.
- `app.py` (repo root, not under `src/`) is a standalone Gradio UI that imports `Imovel` and `consultar_faq` directly — it does not go through MCP.

### Database access

- Target is **Supabase Postgres**, schema **`pierre`**, table **`imoveis`** — hardcoded as class attributes on `Imovel`. This is unrelated to the local Postgres in the root `docker-compose.yml`.
- Connection: `SUPABASE_POSTGRES_DSN` wins if set; otherwise assembled from `SUPABASE_POSTGRES_HOST/PORT/DATABASE/USER/PASSWORD/SSLMODE` via `make_conninfo`. Missing host/user/password raises at call time, not import time.
- Queries are built with `psycopg.sql` composables and run through a `ClientCursor` (client-side param interpolation). `cidade`/`bairro` filters use `unaccent(...) ILIKE unaccent(...)` — the DB must have the `unaccent` extension.

### Search-expansion rules (in `Imovel.buscarImoveis`)

These are intentional fuzzy-matching behaviors, not bugs:

- **Always applied:** `active IS DISTINCT FROM FALSE` — properties with `active = false` are never returned (rows with `active = true` or `NULL` pass). Business rule; keep it unconditional.
- Count fields (`quartos`, `suites`, `banheiros`, `vagas_garagem` → column `vagas_carro`) match a `±2` `BETWEEN` range.
- `area_util` (column `area_util_m2`) matches `±50%`.
- Price: `preco_min`/`preco_max` (or legacy single `preco`); when the effective min and max are equal, the range expands to `-50% / +50%`.
- `limite` is always clamped to `1..100` (clamped again in the tool wrapper and in `app.py`).

### FAQ scoring (`_score_faq_entry`)

Pure-Python heuristic, no embeddings: `difflib.SequenceMatcher` ratio (weight 0.6) + capped token overlap + tag-in-question and question-substring bonuses. Text is accent-stripped and lowercased first. Only entries with `score > 0` are returned. FAQ path override: `FAQ_SOURCE_PATH` (Docker sets it to `/app/data/faq.json`).

### HostHeaderRewriteMiddleware

Starlette middleware in `server.py` that rewrites the `Host` header to `localhost:<port>` for any host not in a hardcoded allow-list (`localhost`, `127.0.0.1`, a specific Docker IP, `mcp_imoveis:8000/mcp`, `n8n`). This exists so n8n / other containers on the Docker network can reach the MCP endpoint despite FastMCP's host validation. Update the allow-list if the container name or network changes.
