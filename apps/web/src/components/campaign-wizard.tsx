'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CAMPAIGN_OBJECTIVES, CONVERSION_DESTINATIONS } from '@adsrobotic/config';
import { Alert, Button, Card, Field, Input, cn } from '@adsrobotic/ui';
import type { ActionState } from '@/app/actions/business';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const SUCCESS_METRIC: Record<string, string> = {
  get_customers: 'Cost per new customer',
  get_leads: 'Cost per qualified lead',
  increase_sales: 'Return on ad spend',
  website_traffic: 'Cost per engaged visit',
  whatsapp_messages: 'Cost per qualified WhatsApp conversation',
  promote_event: 'Cost per registration',
  promote_app: 'Cost per install',
  build_awareness: 'Cost per thousand reached',
  recruit_participants: 'Cost per eligible sign-up',
};

const STEPS = ['Goal', 'Offer', 'Destination', 'Budget', 'Plan'];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="growth" size="lg" disabled={pending}>
      {pending ? 'Building your plan…' : 'Approve & create campaign'}
    </Button>
  );
}

export function CampaignWizard({
  action,
  currency,
  channels,
}: {
  action: Action;
  currency: string;
  channels: Array<{ channel: string; label: string; configured: boolean }>;
}) {
  const [state, formAction] = useActionState(action, {});
  const [step, setStep] = useState(0);

  const [objective, setObjective] = useState('get_leads');
  const [destination, setDestination] = useState('whatsapp');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [budgetTotal, setBudgetTotal] = useState(300);
  const [durationDays, setDurationDays] = useState(30);
  const [destinationValue, setDestinationValue] = useState('');
  const [channel, setChannel] = useState(channels[0]?.channel ?? 'meta');

  const daily = durationDays > 0 ? Math.round((budgetTotal / durationDays) * 100) / 100 : 0;
  const objectiveLabel =
    CAMPAIGN_OBJECTIVES.find((o) => o.key === objective)?.label ?? objective;
  const destinationLabel =
    CONVERSION_DESTINATIONS.find((d) => d.key === destination)?.label ?? destination;

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const needsDestinationValue = destination === 'website' || destination === 'whatsapp' || destination === 'phone';
  const destinationPlaceholder =
    destination === 'website' ? 'https://your-site.com' : destination === 'phone' ? '+256…' : 'WhatsApp number, e.g. +256…';

  return (
    <form action={formAction} className="space-y-6">
      {/* Stepper */}
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                i <= step ? 'bg-ar-blue text-ar-white' : 'bg-ar-blue-light text-ar-blue',
              )}
            >
              {i + 1}
            </span>
            <span className={cn('text-sm', i === step ? 'font-semibold text-ar-text' : 'text-ar-muted')}>
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="text-ar-border">—</span> : null}
          </li>
        ))}
      </ol>

      {state.error ? <Alert tone="critical">{state.error}</Alert> : null}

      {/* Hidden fields carry all state so the final submit has everything */}
      <input type="hidden" name="objective" value={objective} />
      <input type="hidden" name="conversionDestination" value={destination} />
      <input type="hidden" name="budgetTotal" value={budgetTotal} />
      <input type="hidden" name="durationDays" value={durationDays} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="destinationValue" value={needsDestinationValue ? destinationValue : ''} />
      <input type="hidden" name="channel" value={channel} />

      <Card className="p-6">
        {/* Step 0 — Goal */}
        {step === 0 ? (
          <div>
            <h2 className="text-lg font-semibold text-ar-text">What do you want to achieve?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {CAMPAIGN_OBJECTIVES.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setObjective(o.key)}
                  className={cn(
                    'rounded-lg border p-4 text-left text-sm font-medium transition-colors',
                    objective === o.key
                      ? 'border-ar-blue bg-ar-blue-light text-ar-blue'
                      : 'border-ar-border text-ar-text hover:border-ar-blue-bright',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Step 1 — Offer */}
        {step === 1 ? (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-ar-text">Tell AdsRobotic about this campaign</h2>
            <Field label="Campaign name" htmlFor="wiz-name">
              <Input
                id="wiz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Weekend Fresh — WhatsApp Orders"
              />
            </Field>
            <Field label="Target market" htmlFor="wiz-location" hint="City, region, or country">
              <Input
                id="wiz-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Kampala + 10km"
              />
            </Field>
          </div>
        ) : null}

        {/* Step 2 — Destination */}
        {step === 2 ? (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-ar-text">Where should your customers go?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONVERSION_DESTINATIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDestination(d.key)}
                  className={cn(
                    'rounded-lg border p-4 text-left text-sm font-medium transition-colors',
                    destination === d.key
                      ? 'border-ar-blue bg-ar-blue-light text-ar-blue'
                      : 'border-ar-border text-ar-text hover:border-ar-blue-bright',
                  )}
                >
                  {d.label}
                  {d.key === 'smart_page' ? (
                    <span className="mt-1 block text-xs font-normal text-ar-muted">
                      We build a mobile-first conversion page for you.
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            {needsDestinationValue ? (
              <Field label={`${destinationLabel} destination`} htmlFor="wiz-dest">
                <Input
                  id="wiz-dest"
                  value={destinationValue}
                  onChange={(e) => setDestinationValue(e.target.value)}
                  placeholder={destinationPlaceholder}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        {/* Step 3 — Budget */}
        {step === 3 ? (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-ar-text">What is your budget?</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={`Total budget (${currency})`} htmlFor="wiz-budget">
                <Input
                  id="wiz-budget"
                  type="number"
                  min={1}
                  value={budgetTotal}
                  onChange={(e) => setBudgetTotal(Number(e.target.value))}
                />
              </Field>
              <Field label="Duration (days)" htmlFor="wiz-days">
                <Input
                  id="wiz-days"
                  type="number"
                  min={1}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label={`Max cost per lead (${currency})`} htmlFor="wiz-cpl" hint="Optional — Budget Guardian pauses campaigns that exceed this.">
              <Input id="wiz-cpl" name="maxCostPerLead" type="number" min={0} step="0.01" placeholder="5" />
            </Field>
            <Field label="Advertising channel" htmlFor="wiz-channel">
              <select
                id="wiz-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="h-10 w-full rounded border border-ar-border bg-ar-white px-3 text-sm text-ar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-blue-bright"
              >
                {channels.map((c) => (
                  <option key={c.channel} value={c.channel}>
                    {c.label}
                    {c.configured ? '' : ' — not configured'}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-sm text-ar-muted">
              That&apos;s about{' '}
              <span className="font-semibold text-ar-text">
                {currency} {daily}
              </span>{' '}
              per day.
            </p>
          </div>
        ) : null}

        {/* Step 4 — Plan */}
        {step === 4 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-ar-text">Your AI advertising plan</h2>
            <dl className="grid grid-cols-2 gap-4 rounded-lg bg-ar-background p-4 text-sm">
              <PlanRow label="Objective" value={objectiveLabel} />
              <PlanRow label="Destination" value={destinationLabel} />
              <PlanRow label="Target market" value={location || 'Your primary market'} />
              <PlanRow label="Budget" value={`${currency} ${budgetTotal} · ${currency} ${daily}/day`} />
              <PlanRow label="Duration" value={`${durationDays} days`} />
              <PlanRow label="Channel" value={channels.find((c) => c.channel === channel)?.label ?? channel} />
              <PlanRow label="Success metric" value={SUCCESS_METRIC[objective] ?? '—'} />
            </dl>
            <Alert tone="ai">
              AdsRobotic will draft the strategy and creatives and hold the campaign for your
              approval. It will pause anything that breaches your cost limits.
            </Alert>
          </div>
        ) : null}
      </Card>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" onClick={back} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            onClick={next}
            disabled={step === 1 && !name.trim()}
          >
            Continue
          </Button>
        ) : (
          <Submit />
        )}
      </div>
    </form>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ar-muted">{label}</dt>
      <dd className="font-medium text-ar-text">{value}</dd>
    </div>
  );
}
