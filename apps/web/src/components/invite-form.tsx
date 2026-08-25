'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, Button, Field, Input } from '@adsrobotic/ui';
import type { TeamActionState } from '@/app/actions/team';

interface RoleOption {
  value: string;
  label: string;
}
interface BusinessOption {
  id: string;
  name: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create invite'}
    </Button>
  );
}

export function InviteForm({
  action,
  roles,
  businesses,
}: {
  action: (prev: TeamActionState, formData: FormData) => Promise<TeamActionState>;
  roles: RoleOption[];
  businesses: BusinessOption[];
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="critical">{state.error}</Alert> : null}
      {state.inviteUrl ? (
        <Alert tone="success" title="Invite created">
          <p className="mb-2 text-sm">Share this single-use link with your teammate:</p>
          <input
            readOnly
            value={state.inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-ar-border bg-ar-white px-2 py-1.5 font-mono text-xs text-ar-text"
          />
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Email" htmlFor="email" className="sm:col-span-1">
          <Input id="email" name="email" type="email" required placeholder="teammate@company.com" />
        </Field>
        <Field label="Role" htmlFor="role">
          <select
            id="role"
            name="role"
            className="h-10 w-full rounded border border-ar-border bg-ar-white px-3 text-sm text-ar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-blue-bright"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Access" htmlFor="businessId">
          <select
            id="businessId"
            name="businessId"
            className="h-10 w-full rounded border border-ar-border bg-ar-white px-3 text-sm text-ar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-blue-bright"
          >
            <option value="org">All businesses (org-wide)</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Submit />
    </form>
  );
}
