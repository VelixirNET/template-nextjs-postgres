import { isConfigured, listEntries, type Entry } from '@/lib/db';
import { SignForm } from './sign-form';

// Render on every request, never at build time. The build has no DATABASE_URL (velixir does not
// pass app variables to it), so a page prerendered then would either fail the build or bake in
// an empty guestbook.
export const dynamic = 'force-dynamic';

export default async function Home() {
  // No database bound yet. Rather than failing (an error page reads as "the platform is
  // broken"), say exactly what is missing and how to fix it.
  if (!isConfigured()) return <Setup />;

  let entries: Entry[];
  try {
    entries = await listEntries();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('database not reachable:', message);
    return <Waiting error={message} />;
  }

  return (
    <>
      <h1>Guestbook</h1>
      <p className="sub">
        Stored in managed Postgres, reached through <code>DATABASE_URL</code>. Signing runs a
        Server Action.
      </p>

      <SignForm />

      <ul className="entries">
        {entries.length === 0 ? (
          <li className="empty">Nobody has signed yet. Be the first.</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id}>
              <p className="who">
                <strong>{entry.name}</strong>
                <time dateTime={entry.created_at.toISOString()}>{formatTime(entry.created_at)}</time>
              </p>
              {/* React escapes text, so a message containing HTML is shown, never run. */}
              <p className="what">{entry.message}</p>
            </li>
          ))
        )}
      </ul>
    </>
  );
}

function Setup() {
  return (
    <>
      <h1>Connect a database</h1>
      <p className="sub">This guestbook keeps its entries in Postgres, and no database is bound to it yet.</p>
      <ol className="steps">
        <li>
          <strong>Create a managed Postgres</strong> from the Databases page, or run{' '}
          <code>velixir db create</code>.
        </li>
        <li>
          <strong>Bind it to this app</strong> as <code>DATABASE_URL</code>: on the database&apos;s
          page under Bound apps, or{' '}
          <code>velixir db bind &lt;database-id&gt; --app &lt;app-id&gt;</code>.
        </li>
        <li>
          <strong>Redeploy</strong> with the Redeploy button on the live release (Deploys tab).
          The table is created on the first visit after that.
        </li>
      </ol>
      <p className="note">Deploying this template from the velixir gallery does all three for you.</p>
    </>
  );
}

function Waiting({ error }: { error: string }) {
  return (
    <>
      <h1>Waiting for the database</h1>
      <p className="sub">The app is running and tries the connection again on every visit.</p>
      <p className="note">
        Last error: <code>{error}</code>
      </p>
      <p className="note">If the database password was rotated, redeploy the app to pick up the new one.</p>
    </>
  );
}

// Rendered on the server, so it is shown in UTC rather than guessing the visitor's time zone.
function formatTime(date: Date): string {
  return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}
