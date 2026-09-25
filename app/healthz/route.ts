import { isConfigured, ping } from '@/lib/db';

// Checked on every request, never answered from a build-time snapshot.
export const dynamic = 'force-dynamic';

// Liveness AND readiness. With no database bound it answers 200, so the setup page stays
// reachable instead of the platform restarting the app in a loop. Once one is bound, the app is
// useless without it, so a failed query takes it out of rotation rather than serving errors.
export async function GET() {
  if (!isConfigured()) return text('ok (setup mode: no database bound)');

  try {
    await ping();
    return text('ok');
  } catch (err) {
    console.error('health check failed:', err instanceof Error ? err.message : err);
    return text('database unreachable', 503);
  }
}

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
