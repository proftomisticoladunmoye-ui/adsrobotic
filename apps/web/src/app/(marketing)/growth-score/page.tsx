'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Field, Input, NetworkSignature } from '@adsrobotic/ui';

/**
 * Free AI Ad Audit — the "Check My Advertising Readiness" viral engine
 * (Spec §15, Stage 2). This foundation build computes a deterministic demo
 * score entirely client-side (no data leaves the browser). A later phase wires
 * it to the Business Brain to produce a real, analysed score and lead capture.
 */

type Row = { label: string; value: number };

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function scoreFor(seed: string, base: number): number {
  // Deterministic pseudo-score in a plausible band; demo only.
  return Math.min(96, Math.max(38, base + (hashString(seed) % 24)));
}

export default function GrowthScorePage() {
  const [form, setForm] = useState({ name: '', website: '', industry: '', country: '' });
  const [rows, setRows] = useState<Row[] | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const seed = `${form.name}|${form.website}|${form.industry}|${form.country}`;
    setRows([
      { label: 'Advertising readiness', value: scoreFor(seed + 'ad', 60) },
      { label: 'Website conversion', value: scoreFor(seed + 'web', 55) },
      { label: 'Audience clarity', value: scoreFor(seed + 'aud', 66) },
      { label: 'Creative readiness', value: scoreFor(seed + 'crv', 50) },
      { label: 'Tracking readiness', value: scoreFor(seed + 'trk', 40) },
    ]);
  }

  const overall = rows ? Math.round(rows.reduce((a, r) => a + r.value, 0) / rows.length) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <Badge tone="growth" className="mb-4">
          Free AI ad audit
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-ar-blue">
          Check your advertising readiness
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ar-muted">
          Get an AdsRobotic Growth Score in seconds. This demo scores entirely in your browser — no
          data leaves your device.
        </p>
      </div>

      <Card className="mt-10 p-6">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="name" className="sm:col-span-2">
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Kampala Fresh Bakery"
            />
          </Field>
          <Field label="Website" htmlFor="website" hint="Optional">
            <Input
              id="website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="example.com"
            />
          </Field>
          <Field label="Industry" htmlFor="industry">
            <Input
              id="industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Food & Beverage"
            />
          </Field>
          <Field label="Country" htmlFor="country">
            <Input
              id="country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Uganda"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="growth" size="lg" className="w-full sm:w-auto">
              Get my Growth Score
            </Button>
          </div>
        </form>
      </Card>

      {rows && overall !== null ? (
        <Card className="mt-6 p-6">
          <div className="flex items-center gap-4">
            <NetworkSignature className="h-10 w-10" animated={false} />
            <div>
              <p className="text-sm text-ar-muted">AdsRobotic Growth Score</p>
              <p className="text-3xl font-semibold tabular-nums text-ar-blue">{overall}/100</p>
            </div>
            <Button asChild variant="ai" size="sm" className="ml-auto">
              <Link href="/signup">Let AdsRobotic fix this</Link>
            </Button>
          </div>
          <div className="mt-6 space-y-4">
            {rows.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ar-muted">{row.label}</span>
                  <span className="font-semibold tabular-nums text-ar-text">{row.value}/100</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-ar-background">
                  <div
                    className="h-2 rounded-full bg-ar-cyan"
                    style={{ width: `${row.value}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-ar-muted">
            Demo score for illustration. A connected Business Brain produces a real, analysed score.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
