'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, Button, Field, Input } from '@adsrobotic/ui';
import type { ActionState } from '@/app/actions/pages';

interface EditorValues {
  id: string;
  title: string;
  brandName: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  offerTitle: string;
  offerBody: string;
  whatsapp: string;
  phone: string;
  website: string;
  showLeadForm: boolean;
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </Button>
  );
}

export function PageEditor({
  action,
  values,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  values: EditorValues;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={values.id} />
      {state.error ? <Alert tone="critical">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">Saved.</Alert> : null}

      <Field label="Page title (internal)" htmlFor="title">
        <Input id="title" name="title" defaultValue={values.title} />
      </Field>
      <Field label="Business name" htmlFor="brandName">
        <Input id="brandName" name="brandName" defaultValue={values.brandName} />
      </Field>
      <Field label="Headline" htmlFor="headline">
        <Input id="headline" name="headline" defaultValue={values.headline} />
      </Field>
      <Field label="Subheadline" htmlFor="subheadline">
        <Input id="subheadline" name="subheadline" defaultValue={values.subheadline} />
      </Field>
      <Field label="Call-to-action label" htmlFor="ctaLabel">
        <Input id="ctaLabel" name="ctaLabel" defaultValue={values.ctaLabel} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Offer title" htmlFor="offerTitle">
          <Input id="offerTitle" name="offerTitle" defaultValue={values.offerTitle} />
        </Field>
        <Field label="Offer body" htmlFor="offerBody">
          <Input id="offerBody" name="offerBody" defaultValue={values.offerBody} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="WhatsApp number" htmlFor="whatsapp" hint="Digits, e.g. 2567…">
          <Input id="whatsapp" name="whatsapp" defaultValue={values.whatsapp} />
        </Field>
        <Field label="Phone number" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={values.phone} />
        </Field>
        <Field label="Website" htmlFor="website">
          <Input id="website" name="website" defaultValue={values.website} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ar-text">
        <input type="checkbox" name="showLeadForm" defaultChecked={values.showLeadForm} />
        Show a lead-capture form
      </label>

      <Save />
    </form>
  );
}
