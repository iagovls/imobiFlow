# AGENTS.md

## Repository Overview

Multi-project repo for **ImobiFlow** — a real estate platform integrating n8n automation, WhatsApp (Meta Cloud API), AI (Dify), and a property CRM.

**NOT a monorepo.** Each subdirectory is an independent project with its own toolchain.

## Project Structure

| Directory | Stack | Entry/Build |
|-----------|-------|-------------|
| `imobiFlow/` | Java 17 / Spring Boot 4.1 / JPA / H2 | `./mvnw spring-boot:run` |
| `frontImobiFlow/` | Angular 21 / Tailwind 4 / Vitest / SSR | `npm run start` |
| `mcp_imoveis/` | Python 3.11+ / FastMCP 3 / psycopg | `uvicorn app:app` or Docker |
| `dify/` | Dify AI platform (pnpm monorepo) | Separate git repo — use `dify/` root |
| Root `docker-compose.yml` | n8n + Postgres + Redis + nginx | `docker compose up -d` |

## Critical Quirks

### `dify/` is a separate git repo
It has its own `.git/`. Do NOT treat changes here as part of the root repo. See `dify/AGENTS.md` for Dify-specific guidance.

### `imobiFlow/` (Spring Boot)
- Uses **Spring Boot 4.1** (latest, not 3.x) — check Jakarta namespace
- H2 in-memory DB for dev; no external DB config yet
- Lombok with annotation processing — run `./mvnw compile` to verify
- Package root: `viliSystem.imobiFlow` (note: not `vili-system`)
- No controllers/services exist yet — only model + repository classes

### `frontImobiFlow/` (Angular)
- Angular 21 with SSR (`@angular/ssr`)
- Tailwind CSS v4 (PostCSS plugin, not the old `tailwind.config.js`)
- Vitest for testing (not Karma/Jasmine)
- Has a nested `crm-para-corretores/` subfolder — unclear purpose, investigate before modifying

### `mcp_imoveis/` (Python MCP)
- Uses `fastmcp` v3 — API differs from v2
- Connects to **Supabase** PostgreSQL (not the local Postgres)
- **Schema do banco de dados: `pierre`**
- Python source is in `src/` (setuptools `package-dir`)
- Build: `pip install -e .` or use Docker

### Root `docker-compose.yml`
- Services: nginx, postgres, redis, n8n, n8n-worker, mcp_imoveis, cloudflared
- nginx routes: port 80 → n8n
- WhatsApp channel is the official **Meta WhatsApp Cloud API**, consumed directly by n8n's WhatsApp nodes via `META_ACCESS_TOKEN` — no self-hosted WhatsApp gateway
- Postgres has init script (`postgres-init`) that creates databases
- **Schema do banco de dados: `pierre`**
- `.env` file contains **real credentials** — never commit secrets
- Cloudflare Tunnel provides external HTTPS access

## Commands

```bash
# Docker (root)
docker compose up -d
docker compose logs -f [service]
docker compose restart [service]

# Spring Boot (imobiFlow/)
cd imobiFlow && ./mvnw spring-boot:run
cd imobiFlow && ./mvnw test

# Angular (frontImobiFlow/)
cd frontImobiFlow && npm install
cd frontImobiFlow && npm run start
cd frontImobiFlow && npm run test
cd frontImobiFlow && npm run build

# MCP server (mcp_imoveis/)
cd mcp_imoveis && pip install -e .
cd mcp_imoveis && python app.py
```

## Environment Variables

Root `.env` is required for Docker Compose. Key vars:
- `POSTGRES_*` — local PostgreSQL credentials
- `SUPABASE_*` — Supabase PostgreSQL (remote)
- `META_ACCESS_TOKEN` — WhatsApp Cloud API (Meta) authentication
- `REDIS_PASSWORD` — Redis auth
- `CLOUDFLARE_TUNNEL_TOKEN` — external access
- `META_ACCESS_TOKEN` — Meta/WhatsApp API

## Deployment

- Target: AWS EC2 (see `ec2-user-data.sh`, `user-data.sh`)
- Provisioning installs Docker, clones repo, runs `docker compose up -d`
- SSL via Let's Encrypt (certbot) — certs mounted into nginx container
- `nginx.conf.prod` exists for production with SSL

## Gotchas

- `.env` contains plaintext secrets — **never git commit**
- `imobiFlow/` uses H2 by default — no Postgres config wired yet
- `frontImobiFlow/` has SSR — server entry is `server.ts`, not just `main.ts`
- `mcp_imoveis/.env` is separate from root `.env` — Supabase connection
- The root `package.json` only has `@lucide/angular` — likely a leftover, not a real project
