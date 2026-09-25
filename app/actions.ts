'use server';

// The one write in the app, as a Server Action. The form calls this function directly: Next.js
// turns it into a POST behind the scenes, so there is no API route to write, and the form still
// works before the page's JavaScript has loaded.

import { revalidatePath } from 'next/cache';
import { addEntry, isConfigured } from '@/lib/db';

export type SignState = {
  ok: boolean;
  message: string;
  // Sent back on failure so the form can put the visitor's text back instead of losing it.
  fields?: { name: string; message: string };
} | null;

export async function sign(_previous: SignState, formData: FormData): Promise<SignState> {
  // Anyone can post to a Server Action, not just this form, so everything is checked again here.
  const name = String(formData.get('name') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const fields = { name, message };

  if (!isConfigured()) {
    return { ok: false, message: 'No database is bound to this app yet, so there is nowhere to save it.', fields };
  }
  if (!name || !message) {
    return { ok: false, message: 'Add your name and a message.', fields };
  }
  if (name.length > 60 || message.length > 500) {
    return { ok: false, message: 'Names stop at 60 characters and messages at 500.', fields };
  }

  try {
    await addEntry(name, message);
  } catch (err) {
    console.error('could not save an entry:', err instanceof Error ? err.message : err);
    return { ok: false, message: 'The database did not answer. Try again in a moment.', fields };
  }

  // Marks the page's data as stale. The action's response then carries the freshly rendered
  // list, so the new entry appears in the same round trip, without a reload.
  revalidatePath('/');
  return { ok: true, message: 'Thanks for signing.' };
}
