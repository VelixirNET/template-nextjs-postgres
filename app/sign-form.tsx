'use client';

// The only component that runs in the browser. useActionState gives the form the action's
// result (the error or the thank-you line) and a pending flag, and it keeps working as a plain
// HTML form when JavaScript is off or still loading.

import { useActionState } from 'react';
import { sign } from './actions';

export function SignForm() {
  const [state, formAction, pending] = useActionState(sign, null);

  // React resets a form after its action finishes. On a failure the fields come back from the
  // server and become the reset values, so a typo does not cost the visitor their message.
  const values = state?.ok === false ? state.fields : undefined;

  return (
    <form action={formAction} className="sign">
      <input
        type="text"
        name="name"
        placeholder="Your name"
        maxLength={60}
        required
        defaultValue={values?.name}
        aria-label="Your name"
      />
      <textarea
        name="message"
        placeholder="Leave a message"
        maxLength={500}
        rows={3}
        required
        defaultValue={values?.message}
        aria-label="Message"
      />
      <div className="row">
        <button type="submit" disabled={pending}>
          {pending ? 'Signing...' : 'Sign the guestbook'}
        </button>
        {state && (
          <p className={state.ok ? 'status ok' : 'status error'} role="status">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
