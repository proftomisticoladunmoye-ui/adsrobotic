'use client';

import { useState } from 'react';
import { CAMPAIGN_OBJECTIVES } from '@adsrobotic/config';
import { Alert, Badge, Button, Card, CardBody, CardHeader, CardTitle } from '@adsrobotic/ui';

interface Variation {
  angle: string;
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
  imageConcept: string;
}

const ANGLE_LABEL: Record<string, string> = {
  problem: 'Problem-focused',
  benefit: 'Benefit-focused',
  social_proof: 'Social-proof-focused',
  urgency: 'Urgency-focused',
};
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

interface Visual {
  dataUrl: string;
  placeholder: boolean;
  provider: string;
}

export function CreativeStudio() {
  const [objective, setObjective] = useState('get_leads');
  const [variations, setVariations] = useState<Variation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visuals, setVisuals] = useState<Record<string, Visual>>({});
  const [visualBusy, setVisualBusy] = useState<string | null>(null);

  async function generateVisual(v: Variation) {
    setVisualBusy(v.angle);
    setError(null);
    try {
      const res = await fetch('/api/v1/creative/image', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: v.imageConcept, headline: v.headline, cta: v.cta, angle: v.angle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Visual generation failed');
      setVisuals((m) => ({
        ...m,
        [v.angle]: { dataUrl: data.dataUrl, placeholder: data.placeholder, provider: data.provider },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Visual generation failed');
    } finally {
      setVisualBusy(null);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/v1/creative/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ objective }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setVariations(data.variations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    if (!variations) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/creative/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variations }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <label className="flex-1">
            <span className="mb-1.5 block text-sm font-medium text-ar-text">Objective</span>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="h-10 w-full rounded border border-ar-border bg-ar-white px-3 text-sm text-ar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-blue-bright"
            >
              {CAMPAIGN_OBJECTIVES.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Button variant="ai" onClick={generate} disabled={busy}>
            {busy && !variations ? 'Generating…' : 'Generate 4 variations'}
          </Button>
        </CardBody>
      </Card>

      {error ? <Alert tone="critical">{error}</Alert> : null}
      {saved ? <Alert tone="success">Saved. Your creatives are in the library below.</Alert> : null}

      {variations ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {variations.map((v, i) => (
              <Card key={v.angle}>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Creative {LETTERS[i]}</CardTitle>
                  <Badge tone="ai">{ANGLE_LABEL[v.angle] ?? v.angle}</Badge>
                </CardHeader>
                <CardBody className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ar-muted">Headline</p>
                    <p className="font-semibold text-ar-text">{v.headline}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ar-muted">Primary text</p>
                    <p className="text-ar-text">{v.primaryText}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ar-muted">Description</p>
                    <p className="text-ar-text">{v.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-ar-orange px-2.5 py-1 text-xs font-semibold text-ar-white">
                      {v.cta}
                    </span>
                  </div>
                  {visuals[v.angle] ? (
                    <div>
                      {/* Generated visual (data URL — SVG poster or AI image). */}
                      <img
                        src={visuals[v.angle]!.dataUrl}
                        alt={`Visual for ${v.headline}`}
                        className="w-full rounded-lg border border-ar-border"
                      />
                      <p className="mt-1 text-xs text-ar-muted">
                        {visuals[v.angle]!.placeholder
                          ? 'On-brand template (connect an image API for photoreal visuals)'
                          : `Generated by ${visuals[v.angle]!.provider}`}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-ar-border bg-ar-background p-3">
                      <p className="text-xs uppercase tracking-wide text-ar-muted">Visual concept</p>
                      <p className="mt-1 text-xs text-ar-muted">{v.imageConcept}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => generateVisual(v)}
                        disabled={visualBusy === v.angle}
                      >
                        {visualBusy === v.angle ? 'Rendering…' : 'Generate visual'}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="growth" onClick={saveAll} disabled={busy || saved}>
              {busy && saved === false ? 'Saving…' : 'Save all variations'}
            </Button>
            <Button variant="secondary" onClick={generate} disabled={busy}>
              Regenerate
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
