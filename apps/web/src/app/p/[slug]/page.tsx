import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicPage, recordPageView } from '@adsrobotic/core';
import { PageLeadForm } from '@/components/page-lead-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicPage(slug);
  if (!page) return { title: 'Not found' };
  return {
    title: page.config.hero.headline,
    description: page.config.hero.subheadline ?? page.config.brand.name,
    robots: page.published ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function SmartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublicPage(slug);
  if (!page) notFound();
  await recordPageView(page.id);

  const { config } = page;
  const c = config.contact ?? {};
  const clickUrl = (type: 'whatsapp' | 'call', to: string) =>
    `/api/v1/p/${slug}/click?type=${type}&to=${encodeURIComponent(to)}`;

  return (
    <div className="min-h-screen bg-ar-background">
      {!page.published ? (
        <div className="bg-ar-warning/15 px-4 py-2 text-center text-xs text-ar-warning">
          Preview — this page is not published yet.
        </div>
      ) : null}

      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          {config.brand.logoUrl ? (
            <img src={config.brand.logoUrl} alt={config.brand.name} className="h-10 w-auto" />
          ) : null}
          <span className="text-lg font-semibold text-ar-blue">{config.brand.name}</span>
        </div>

        {/* Hero */}
        <section className="mt-8">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ar-blue">
            {config.hero.headline}
          </h1>
          {config.hero.subheadline ? (
            <p className="mt-3 text-base text-ar-text">{config.hero.subheadline}</p>
          ) : null}
        </section>

        {/* Quick contact actions */}
        {(c.whatsapp || c.phone) && (
          <div className="mt-6 grid gap-3">
            {c.whatsapp ? (
              <a
                href={clickUrl('whatsapp', c.whatsapp)}
                className="flex h-12 items-center justify-center rounded-lg bg-[color:var(--ar-success)] text-base font-semibold text-white"
              >
                Message us on WhatsApp
              </a>
            ) : null}
            {c.phone ? (
              <a
                href={clickUrl('call', c.phone)}
                className="flex h-12 items-center justify-center rounded-lg border border-ar-blue text-base font-semibold text-ar-blue"
              >
                Call us
              </a>
            ) : null}
          </div>
        )}

        {/* Offer */}
        {config.offer && (config.offer.title || config.offer.body) ? (
          <section className="mt-8 rounded-xl border border-ar-border bg-ar-surface p-5">
            {config.offer.title ? (
              <h2 className="text-lg font-semibold text-ar-text">{config.offer.title}</h2>
            ) : null}
            {config.offer.body ? <p className="mt-2 text-sm text-ar-text">{config.offer.body}</p> : null}
            {config.offer.bullets?.length ? (
              <ul className="mt-3 space-y-1.5 text-sm text-ar-text">
                {config.offer.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-ar-success">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* Products */}
        {config.products?.length ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ar-text">What we offer</h2>
            <div className="mt-3 space-y-3">
              {config.products.map((p, i) => (
                <div key={i} className="rounded-xl border border-ar-border bg-ar-surface p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-ar-text">{p.name}</p>
                    {p.price ? (
                      <p className="font-semibold text-ar-blue">
                        {p.currency ?? ''} {p.price}
                      </p>
                    ) : null}
                  </div>
                  {p.description ? <p className="mt-1 text-sm text-ar-muted">{p.description}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Testimonials */}
        {config.testimonials?.length ? (
          <section className="mt-8 space-y-3">
            {config.testimonials.map((t, i) => (
              <blockquote key={i} className="rounded-xl bg-ar-blue-light p-4 text-sm text-ar-text">
                “{t.quote}”
                {t.author ? <footer className="mt-1 text-xs text-ar-muted">— {t.author}</footer> : null}
              </blockquote>
            ))}
          </section>
        ) : null}

        {/* Lead form */}
        {config.showLeadForm ? (
          <section className="mt-8 rounded-xl border border-ar-border bg-ar-surface p-5">
            <h2 className="text-lg font-semibold text-ar-text">Get in touch</h2>
            <p className="mb-4 mt-1 text-sm text-ar-muted">
              Leave your details and we&apos;ll get back to you.
            </p>
            <PageLeadForm slug={slug} ctaLabel={config.hero.ctaLabel} />
          </section>
        ) : null}

        {/* Location */}
        {config.location?.address ? (
          <section className="mt-8 text-sm text-ar-muted">
            <p className="font-medium text-ar-text">{config.location.label ?? 'Find us'}</p>
            <p className="mt-1">{config.location.address}</p>
          </section>
        ) : null}

        <footer className="mt-12 border-t border-ar-border pt-6 text-center text-xs text-ar-muted">
          Powered by AdsRobotic
        </footer>
      </div>
    </div>
  );
}
