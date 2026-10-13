# Study Task

Study Task is a Russian-language learning platform for students, parents, teachers, and administrators. It is a React, TypeScript, Vite, and Express application with Supabase-backed production data.

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project for persistent production data

## Local development

```sh
npm ci
Copy-Item .env.example .env.local # PowerShell; on macOS/Linux use cp .env.example .env.local
npm run dev
```

The server runs the Vite development middleware on `http://localhost:3000`. To use the local JSON fallback instead of Supabase, leave `SUPABASE_URL` and `SUPABASE_SECRET_KEY` blank. Local data is written under `.data` (or `DATA_DIR`). Do not use this fallback for multiple server instances.

## Environment variables

See [`.env.example`](.env.example). Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` together. `SUPABASE_SERVICE_ROLE_KEY` is also accepted for compatibility; either key is highly privileged and must only exist in the server environment. Set `ADMIN_BOOTSTRAP_PASSWORD` before the first startup to initialize the administrator. `NVIDIA_API_KEY` is needed only for teacher test generation.

## Supabase setup and migrations

For a new project, run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor before starting the application. It creates the application tables, the private homework-file bucket, row-level security, and server-only RPC functions.

Existing projects should apply each SQL file in `supabase/migrations/` once, in filename order. The migration adds the lesson-link columns, private homework storage metadata and bucket, and the daily Sky Quest reward limit. The application cannot apply SQL migrations itself; deploy only after the migration succeeds. The schema files are idempotent where possible, but keep a database backup before changing production data.

If homework files exist in the old local JSON store, run `npm run migrate:homework` from a machine that can read that `DATA_DIR`, after applying the storage migration and setting the Supabase credentials. The migration script is safe to rerun and leaves source files unchanged.

## Production build and Render

Render Web Service commands:

- Build: `npm ci --include=dev && npm run build`
- Start: `npm start`

Set the Supabase, administrator bootstrap, and optional NVIDIA environment variables in Render. The server serves the Vite build from `dist` and listens on Render's `PORT`. Keep production credentials out of Git and browser bundles.

## Quality checks

```sh
npm run lint
npm test
npm run build
```

`npm run clean` removes only the generated `dist` directory; it never removes application source.
