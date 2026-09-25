// Next.js calls register() once when the server starts, before it serves anything. Used here for
// one thing: saying in the logs, at boot, why the app is showing its setup page.
export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.DATABASE_URL) return;

  console.log(
    'DATABASE_URL is not set, so this app is serving its setup page.\n' +
      'On velixir: create a managed Postgres, bind it to this app as DATABASE_URL, then redeploy.\n' +
      'Locally: DATABASE_URL=postgres://user:pass@localhost:5432/guestbook npm run dev',
  );
}
