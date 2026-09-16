# SkillForge

Skill graph and learning path. An Angular frontend served by an Express
Backend-for-Frontend, one Render service, one Neon PostgreSQL database.

Companion repository: **CareerOS** (Next.js + Express).

---

## Why one service and not two

The browser talks to exactly one origin. The Express process serves the
built Angular application as static files and handles `/auth/*` and `/api/*`
on the same host.

That makes the session cookie **first-party**, so `SameSite=Lax` is enough
and no CORS configuration exists anywhere in this repository. Splitting the
frontend onto a different domain would make the cookie third-party, which
Safari blocks by default.

```
browser ──> Express (this service) ──> Neon PostgreSQL
              ├── /                    Angular build
              ├── /auth/*              OIDC: login, callback, logout
              ├── /api/users/me        session cookie
              ├── /api/skills          session cookie
              └── /api/public/skills   Bearer token + audience check
                                       (called by CareerOS, never a browser)
```

## Layout

```
backend/src/config/env.ts              Zod-validated environment
backend/src/config/oidc.ts             discovery document, JWKS
backend/src/lib/session.ts             encrypted (JWE) session cookie
backend/src/lib/prisma.ts              Prisma client with the pg adapter
backend/src/middleware/                requireSession, requireBearer, errors
backend/src/modules/auth/              OIDC flow, refresh, rotation
backend/src/modules/<domain>/          routes → controller → service → repository
backend/prisma/schema.prisma           User, Skill
frontend/                              Angular application
```

Each layer knows only the one below it. The repository is the only place
that imports Prisma, so swapping the ORM never reaches business logic; the
service owns the rules, including ownership checks, so a route cannot leak
data by forgetting one.

## Where a user comes from

There is no registration endpoint. People register with the identity
provider; the row in `users` appears on the **first successful sign-in** and
is refreshed on every later one — just-in-time provisioning, in
`auth.service.ts` right after the identity token is verified.

`auth_sub` holds the `sub` claim: stable for the life of the account and
unchanged by email, username or password changes. That is why it, and not
the email address, is the key to the outside world.

## Running locally

```bash
echo "127.0.0.1 skillforge.localhost careeros.localhost" | sudo tee -a /etc/hosts

cp backend/.env.example backend/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

npm --prefix backend install
npm --prefix backend run db:migrate    # creates the schema in Neon (uses DIRECT_URL)
npm --prefix frontend install
npm --prefix frontend run build        # writes frontend/dist/skillforge/browser
npm --prefix backend run dev           # http://skillforge.localhost:3002
```

For UI work with hot reload, run `npm --prefix frontend start` in a second
terminal: it serves on `http://skillforge.localhost:4200` and proxies `/api`
and `/auth` to the backend, so the browser still sees one origin.

## Deploying to Render

| Setting | Value |
| --- | --- |
| Root Directory | *(repository root)* |
| Build Command | `npm run build` |
| Start Command | `npm start` |

The root `build` script installs both workspaces with `--include=dev`,
builds the Angular bundle, compiles the backend and applies migrations.
`--include=dev` matters: with `NODE_ENV=production` npm skips
devDependencies, where the Angular CLI, TypeScript and the Prisma CLI live.

Environment: everything from `backend/.env.example` except `PORT` (Render
provides it), plus `NODE_ENV=production`. Then add the service URL to the
Auth0 callback, logout and origin lists.

## Notes

- `app.set('trust proxy', 1)` is required behind Render's TLS termination;
  without it `secure` cookies quietly stop working.
- Sessions are encrypted cookies, not server state.
- Refresh tokens are requested with `offline_access` and rotated on use.
- `prisma generate` writes the client into `backend/src/generated/prisma`,
  which is gitignored and regenerated at build time.
- Two Neon URLs, on purpose. `DATABASE_URL` is the pooled endpoint and is what
  the server runs on; `DIRECT_URL` is the same database without `-pooler` and
  is used only by the Prisma CLI. Transaction-mode pooling returns the
  connection to the pool after every transaction, which breaks the
  session-level advisory lock Prisma Migrate uses to serialise deploys — the
  symptom is a migration that hangs rather than one that errors.
