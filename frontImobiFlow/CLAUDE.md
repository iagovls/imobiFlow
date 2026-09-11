# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`frontImobiFlow` is the Angular 21 web UI for **ImobiFlow**, a real-estate CRM for brokers. It is one app inside the larger `docker-evolution-and-n8n` monorepo (n8n automations + Supabase backend). Language of the domain, UI, routes, and most comments is **Portuguese (pt-BR)** — keep new user-facing strings and route paths in Portuguese to match.

## Commands

```bash
npm run start          # dev server + SSR at http://localhost:4200 (runs set-env.js first via prestart)
npm run build          # production build -> dist/ (browser + server + prerender bundles)
npm run watch          # incremental dev build
npm run test           # Vitest unit tests (Angular `@angular/build:unit-test` builder)
npm test -- <pattern>  # run a single spec, e.g. npm test -- menu-service
npx prettier --write . # format (config in .prettierrc: single quotes, width 100)
```

There is no lint script. `*.spec.ts` files live next to their source; most are the default "should be created" smoke test.

## Environment injection (important)

Angular's `environment.ts` / `environment.prod.ts` are **generated, git-ignored artifacts** — never edit them by hand and never commit credentials. `set-env.js` runs automatically on `prestart` and `prebuild`:

- It reads the repo-root `.env` (via `dotenv`) and writes both env files.
- Required keys: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SCHEMA`. Also consumed: `S3_API_BASE_URL`, `S3_API_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- If you add a new environment field, add it to the `content()` template in `set-env.js`, to `src/environments/environment.example.ts`, and to the `S3Env` / access shapes in the services.

## Architecture

**Standalone components + Signals throughout.** No NgModules. State is `signal()` / `computed()`; services are `providedIn: 'root'`. Many small components define their template inline; larger ones use `templateUrl`. Styling is **Tailwind CSS v4** (`@import 'tailwindcss'` in `src/styles.css`, theme tokens via `@theme`), icons from `@lucide/angular` plus hand-rolled SVG components under `components/icons/`.

**Layout shell:** `App` → `Home` (renders `Menu` + `Header` + `MainComponent`) → `<router-outlet>`. `MenuService` derives the active nav section by matching `router.url` against its `sections` list on every `NavigationEnd`.

**Routing** (`app/app.routes.ts`): public routes (`/login`, `/esqueci-senha`, `/redefinir-senha`) are guarded by `publicGuard`; app routes (`/leads`, `/imoveis`, `/agenda`, `/negociacoes`, `/perfil`) by `authGuard`. Both guards in `app/guards/auth.guard.ts` busy-wait on `authService.loading()` before deciding. Default and wildcard redirect to `/leads`.

**SSR** (`src/server.ts`, `app.routes.server.ts`): Express server; auth routes render `RenderMode.Client`, `''` is prerendered, everything else client-rendered. Guarded routes touch `window`/`document` (e.g. `LeadsComponent` toggles `document.body.style.overflow`) — keep browser-only code out of constructors/SSR paths or guard it.

**Auth** (`app/services/auth.service.ts`): Supabase Auth (email/password) with signal-based `user`/`session`/`profile`/`isAuthenticated`. Multiple apps share one Supabase project; a **Custom Access Token Hook (PL/pgSQL)** injects an `app_id` claim, and `login()` rejects (and signs out) any user whose `app_metadata.app_id !== 'imobiflow'`. `initSession()` wires `onAuthStateChange`.

**Data services** talk directly to Supabase from the browser using the anon key, scoped to a non-public Postgres schema via an untyped cast:
`(supabase as unknown as { schema }).schema(...)`. `PropertiesService` (`imoveis` table) reads the schema from `environment.supabaseSchema`; `LeadsService` (`usuarios`, `conversation` tables) hardcodes `'pierre'`. Domain types (`Imovel`, `Lead`, `ConversationMessage`) are defined inline in each service. Errors are logged and swallowed, returning `[]` / `null`.

**Media / S3** (`app/services/s3.service.ts`): property photos are stored in the AWS S3 bucket `fotos-imoveis-pierre` (`us-east-1`) via Supabase Edge Functions (`get-s3-property-images`, `get-s3-presigned-upload-url`, `proxy-s3-upload`, `delete-s3-property-image`, `create-s3-folder`, `delete-s3-prefix`). `buildAuthHeaders()` attaches the current session JWT (falling back to the anon key). Every method **catches failures and returns an optimistic mock result** (`true`, `[]`, `{deleted:0}`) so the UI degrades instead of erroring — bear this in mind when debugging "successful" operations that didn't happen. `PropertiesService` calls S3 folder create/delete alongside `imoveis` row create/delete, keyed by `imv_codigo` prefix.

### Edge Function constraints (from prior deploys — see README §3)

- Deno Edge Functions must **not** send a body on HTTP 204.
- S3 region must be pinned to `us-east-1` in code (avoids 307 redirects).
- AWS creds live in Supabase **global Project Secrets**, not per-function.
- The S3 bucket CORS must allow browser `PUT` for presigned uploads.

## Agent skills

`.agents/skills/` vendors two Supabase skills (`supabase`, `supabase-postgres-best-practices`) pinned in `skills-lock.json` — consult them for Supabase schema, RLS, auth hook, and Postgres work.
