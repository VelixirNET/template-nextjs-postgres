import { isConfigured, listEntries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// The newest 100 entries as JSON: the same data as the page, for scripts and other apps.
export async function GET() {
  if (!isConfigured()) {
    return Response.json(
      { error: 'No database is bound to this app yet. Bind a managed Postgres as DATABASE_URL and redeploy.' },
      { status: 503 },
    );
  }

  try {
    return Response.json(await listEntries());
  } catch (err) {
    console.error('database not reachable:', err instanceof Error ? err.message : err);
    return Response.json({ error: 'Waiting for the database.' }, { status: 503 });
  }
}
