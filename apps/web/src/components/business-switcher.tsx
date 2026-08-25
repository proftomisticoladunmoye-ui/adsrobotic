import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import type { AccessibleBusiness } from '@adsrobotic/core';
import { switchBusinessAction, createBusinessAction } from '@/app/actions/businesses';

/**
 * BusinessSwitcher — pick the active business, or add a new one (Spec §19).
 * A native <details> disclosure keeps it a server component (no client JS): each
 * option is a form posting the switch action; the footer adds a business.
 */
export function BusinessSwitcher({
  businesses,
  activeId,
  activeName,
  activeStage,
}: {
  businesses: AccessibleBusiness[];
  activeId: string;
  activeName: string;
  activeStage: string;
}) {
  const multiOrg = new Set(businesses.map((b) => b.organizationId)).size > 1;
  const initial = activeName.charAt(0).toUpperCase();

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl border border-ar-border/70 bg-ar-background p-2.5 transition-colors hover:border-ar-blue-bright/40 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ar-blue text-sm font-semibold text-ar-white">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ar-text">{activeName}</span>
          <span className="block truncate text-xs text-ar-muted">{activeStage}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-ar-muted" />
      </summary>

      <div className="absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-xl border border-ar-border bg-ar-white shadow-pop">
        <div className="max-h-64 overflow-y-auto p-1.5">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ar-muted">
            {businesses.length > 1 ? 'Switch business' : 'Your business'}
          </p>
          {businesses.map((b) => (
            <form key={b.id} action={switchBusinessAction}>
              <input type="hidden" name="businessId" value={b.id} />
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ar-text transition-colors hover:bg-ar-blue-light"
              >
                <Building2 className="h-4 w-4 shrink-0 text-ar-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{b.name}</span>
                  {multiOrg ? (
                    <span className="block truncate text-xs text-ar-muted">{b.organizationName}</span>
                  ) : null}
                </span>
                {b.id === activeId ? <Check className="h-4 w-4 shrink-0 text-ar-blue-bright" /> : null}
              </button>
            </form>
          ))}
        </div>
        <form action={createBusinessAction} className="flex items-center gap-1.5 border-t border-ar-border p-2">
          <input
            name="name"
            required
            placeholder="New business name"
            className="h-8 min-w-0 flex-1 rounded-md border border-ar-border px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ar-blue-bright"
          />
          <button
            type="submit"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ar-blue text-ar-white transition-colors hover:bg-ar-blue-dark"
            aria-label="Add business"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </div>
    </details>
  );
}
