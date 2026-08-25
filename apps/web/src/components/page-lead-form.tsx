'use client';

import { useState } from 'react';

/** Lead capture form for a public Smart Page. Posts to the page's lead API. */
export function PageLeadForm({ slug, ctaLabel }: { slug: string; ctaLabel: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/v1/p/${slug}/lead`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          message: fd.get('message'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setState('done');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-xl border border-ar-border bg-ar-cyan-light p-6 text-center">
        <p className="text-lg font-semibold text-ar-blue">Thank you!</p>
        <p className="mt-1 text-sm text-ar-text">We&apos;ve got your details and will be in touch.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        name="name"
        placeholder="Your name"
        className="h-11 w-full rounded-lg border border-ar-border px-3 text-base"
      />
      <input
        name="phone"
        placeholder="Phone number"
        inputMode="tel"
        className="h-11 w-full rounded-lg border border-ar-border px-3 text-base"
      />
      <input
        name="email"
        type="email"
        placeholder="Email (optional)"
        className="h-11 w-full rounded-lg border border-ar-border px-3 text-base"
      />
      <textarea
        name="message"
        rows={3}
        placeholder="How can we help?"
        className="w-full rounded-lg border border-ar-border px-3 py-2 text-base"
      />
      {error ? <p className="text-sm text-ar-critical">{error}</p> : null}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="h-12 w-full rounded-lg bg-ar-orange text-base font-semibold text-white disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : ctaLabel}
      </button>
    </form>
  );
}
