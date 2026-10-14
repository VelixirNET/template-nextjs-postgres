# Next.js + Postgres

[![Deploy on velixir](https://velixir.net/img/deploy-on-velixir.svg)](https://velixir.net/new?template=nextjs-postgres)

A guestbook: sign it, and your entry appears at the top. Next.js 15 with the App Router, React
19 and TypeScript on the front, managed Postgres behind it, and a Server Action in between.

[Deploy it on velixir](https://velixir.net/new?template=nextjs-postgres).

The guestbook is small on purpose: one page, one Server Action, one table. What it gets right
is the part that usually breaks when a Next.js app meets a real database: builds that try to
reach it, TLS that will not connect, and error pages where a setup page should be.

## What it shows

- **Server Actions instead of an API layer.** The form calls a server function directly.
  `revalidatePath` sends the fresh list back in the same round trip, so the new entry appears
  without a reload, and the form still works before the page's JavaScript has loaded.
- **Nothing touches the database at build time.** velixir does not pass app variables to the
  build, so the page and route handlers are rendered on request (`force-dynamic`), and
  `npm run build` passes with no environment at all.
- **TLS the way velixir means it.** The database encrypts every connection with a certificate
  from velixir's own CA. node-postgres misreads `sslmode=require` as "verify against public
  CAs" and lets the URL override your options, so the stock setup fails with
  `self-signed certificate`. The top of `lib/db.ts` is the fix, and it is worth copying into
  your own apps.
- **A setup page instead of a crash.** Start it with no database and the page says exactly
  what to do while `/healthz` stays green. Lose the database later and the page explains the
  wait, then recovers on the next visit once the database is back.
- **An honest health check.** `/healthz` runs `SELECT 1`. This app is useless without its
  database, so a failed query takes it out of rotation rather than serving errors.
- **One connection pool per process**, parameterised queries, and output escaped by React.

## Setting it up on velixir

Deploy it from the gallery. velixir creates a managed Postgres, binds it to the app as
`DATABASE_URL`, and holds the first deploy until the database is running, so the app starts
connected. The table is created on first use.

By hand, for example after deploying your own copy with `velixir deploy`:

1. Create a managed Postgres from the Databases page, or run `velixir db create`.
2. Bind it to the app as `DATABASE_URL`: on the database's page under Bound apps, or
   `velixir db bind <database-id> --app <app-id>`.
3. Redeploy, with the Redeploy button on the live release in the Deploys tab.

## Running it locally

```bash
npm install
DATABASE_URL=postgres://user:pass@localhost:5432/guestbook npm run dev
```

Then open http://localhost:3000. With no `sslmode` in the URL, the connection is plain TCP,
which is what a local Postgres expects. For the production build, as velixir runs it:
`npm run build`, then `npm start`.

## Deploying

```bash
velixir deploy
```

## Things to know

**It fits the Free plan.** Capped at 256 MB, it measured about 96 MB idle and peaked at about
150 MB under light load (thousands of requests, up to 25 at once). The Free plan sleeps after 15
idle minutes, and Next.js takes a second or two to start, so the first visit after a sleep is
slower than the rest.

**Anyone with the URL can sign it.** There are no accounts, no moderation and no spam
protection. Add sign-in or a moderation step before you share the address widely.

**The table is created on first use.** `CREATE TABLE IF NOT EXISTS` on the first request is
fine for one table and one replica. Scale past one replica and several instances race the same
migration on every deploy. Move to a real migration step before that happens.

**The certificate is not verified by default.** The connection is encrypted, but `lib/db.ts` does not check
who issued the certificate, which matches what `sslmode=require` means everywhere else. To verify the
server as well, download your database's CA certificate from its page in the velixir dashboard
and connect with `sslmode=verify-full` and the `ca` option, which `lib/db.ts` leaves alone. See
https://velixir.net/docs/databases#verifying-the-server-certificate.

**Nothing is kept on disk.** The container's filesystem is wiped on every redeploy and restart,
so Next.js's own cache starts empty each time, and anything you add that stores files (uploads,
generated images) needs object storage.

**Two settings live in `nixpacks.toml`.** Telemetry is switched off, and the start command runs
Next.js directly instead of through npm, so it receives the stop signal on a redeploy and
finishes its requests before exiting. If you change `npm start`, change it there too.

**`package.json` pins PostCSS.** Next.js 15 depends on an older PostCSS that `npm audit` flags
(the advisories concern building untrusted CSS, which this app never does). The `overrides`
entry moves it to a current 8.5 release, the line Next.js 16 uses, so installs and build logs
stay clean. Remove it once Next.js 15 updates PostCSS itself.

## Routes

| Method | Path | Does |
| --- | --- | --- |
| `GET` | `/` | The guestbook, or the setup page when no database is bound |
| `POST` | `/` | The sign Server Action (Next.js routes it; you never call it by URL) |
| `GET` | `/api/entries` | Newest 100 entries as JSON |
| `GET` | `/healthz` | 200 when the database answers (or no database is bound yet), 503 while it is unreachable |

## Licence

MIT.
