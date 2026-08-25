'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, Button, Field, Input } from '@adsrobotic/ui';
import type { ActionState } from '@/app/actions/business';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="growth" size="lg" disabled={pending}>
      {pending ? 'Teaching AdsRobotic…' : 'Save & continue'}
    </Button>
  );
}

export function BrainForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5">
      {state.error ? <Alert tone="critical">{state.error}</Alert> : null}
      <Field label="Industry" htmlFor="industry">
        <Input id="industry" name="industry" placeholder="Food & Beverage" required />
      </Field>
      <Field label="What does your business do?" htmlFor="description" hint="A sentence or two.">
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          className="w-full rounded border border-ar-border bg-ar-white px-3 py-2 text-sm text-ar-text placeholder:text-ar-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-blue-bright"
          placeholder="Artisan bakery serving fresh bread, cakes, and pastries in Kampala."
        />
      </Field>
      <Field label="What makes you the right choice?" htmlFor="valueProposition">
        <Input
          id="valueProposition"
          name="valueProposition"
          placeholder="Fresh every morning, delivered across the city."
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Website" htmlFor="website" hint="Optional">
          <Input id="website" name="website" placeholder="example.com" />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Input id="currency" name="currency" defaultValue="USD" maxLength={3} />
        </Field>
      </div>
      <Submit />
    </form>
  );
}
