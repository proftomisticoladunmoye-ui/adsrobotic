'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, Button, Field, Input } from '@adsrobotic/ui';
import type { ActionState } from '@/app/actions/auth';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="growth" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Working…' : label}
    </Button>
  );
}

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function SignupForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4 text-left">
      {state.error ? <Alert tone="critical">{state.error}</Alert> : null}
      <Field label="Business name" htmlFor="businessName">
        <Input id="businessName" name="businessName" required placeholder="Kampala Fresh Bakery" />
      </Field>
      <Field label="Your name" htmlFor="name" hint="Optional">
        <Input id="name" name="name" placeholder="Enoch" />
      </Field>
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" required placeholder="you@business.com" />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters">
        <Input id="password" name="password" type="password" required minLength={10} />
      </Field>
      <SubmitButton label="Create account" />
    </form>
  );
}

export function LoginForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4 text-left">
      {state.error ? <Alert tone="critical">{state.error}</Alert> : null}
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" required placeholder="you@business.com" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" required />
      </Field>
      <SubmitButton label="Log in" />
    </form>
  );
}
