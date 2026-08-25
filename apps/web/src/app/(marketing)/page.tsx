import Link from 'next/link';
import { AUTONOMY_LEVELS, BRAND } from '@adsrobotic/config';
import { Badge, Button, Card, NetworkSignature } from '@adsrobotic/ui';
import { HeroNetwork } from '@/components/hero-network';

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <ChatExample />
      <Engines />
      <HowItWorks />
      <Autonomy />
      <Guardian />
      <GrowthScore />
      <FinalCta />
    </>
  );
}

/* ─────────────────────────── Hero ─────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ar-border bg-ar-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <Badge tone="ai" className="mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-ar-cyan" aria-hidden />
            {BRAND.category}
          </Badge>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-ar-blue sm:text-5xl">
            Hire your AI advertising employee.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ar-muted">
            AdsRobotic learns your business, creates your campaigns, watches your budget, and helps
            you find more customers — across every channel.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="growth" size="lg">
              <Link href="/signup">{BRAND.primaryCta}</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="#how">Watch it work</a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-ar-muted">
            Start with the $10 challenge. Tell it your goal. Watch what it can do.
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div
            className="absolute inset-0 rounded-full bg-ar-blue-light blur-2xl"
            aria-hidden
          />
          <div className="relative">
            <HeroNetwork />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Category strip ───────────────────── */

function CategoryStrip() {
  const lines = [
    'You hire employees for finance.',
    'You hire employees for customer service.',
    'Now hire an AI employee for advertising.',
  ];
  return (
    <section className="bg-ar-blue">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {lines.map((l, i) => (
              <p
                key={l}
                className={
                  i === lines.length - 1
                    ? 'text-lg font-semibold text-ar-white'
                    : 'text-lg text-ar-white/70'
                }
              >
                {l}
              </p>
            ))}
          </div>
          <p className="text-2xl font-semibold tracking-tight text-ar-cyan">
            Don&apos;t manage ads. Employ AdsRobotic.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Chat example ────────────────────── */

function ChatExample() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="The command interface"
        title="Just tell it what you want."
        blurb="AdsRobotic responds using your business memory and live campaign data — then you approve or adjust the plan."
      />
      <Card className="mt-10 overflow-hidden">
        <div className="space-y-4 p-6">
          <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-ar-blue px-4 py-3 text-sm text-ar-white">
            I want to increase sales of my psychometric software in East Africa. My budget is $500
            this month.
          </div>
          <div className="flex max-w-[92%] gap-3">
            <NetworkSignature className="mt-1 h-7 w-7 shrink-0" animated={false} />
            <div className="rounded-lg rounded-tl-sm border border-ar-border bg-ar-background px-4 py-3 text-sm text-ar-text">
              I&apos;ve analysed your business profile and previous campaigns. I recommend splitting
              the budget across search-intent traffic, social discovery, and retargeting. I&apos;ll
              test three audience hypotheses and four creative variations, and I will not exceed your
              $500 monthly budget. Any campaign that passes your maximum cost-per-qualified-lead
              threshold is paused automatically.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-ar-border bg-ar-white px-6 py-4">
          <Button variant="ai" size="sm">
            Approve plan
          </Button>
          <Button variant="secondary" size="sm">
            Adjust budget
          </Button>
        </div>
      </Card>
    </section>
  );
}

/* ───────────────────────── Engines ────────────────────────── */

const ENGINES = [
  {
    n: '01',
    title: 'Business Brain',
    body: 'A persistent intelligence profile of your business and customers that grows more valuable the longer you use it.',
  },
  {
    n: '02',
    title: 'AI Campaign Strategist',
    body: 'Turns a plain-language goal into a complete, executable strategy — audience, channels, budget, and success metric.',
  },
  {
    n: '03',
    title: 'AI Creative Factory',
    body: 'Generates headlines, copy, visuals, and video concepts — plus testable problem, benefit, social-proof, and urgency variations.',
  },
  {
    n: '04',
    title: 'Budget Guardian',
    body: 'Watches every dollar against your guardrails and pauses campaigns before they overspend — money it protects is money you keep.',
  },
  {
    n: '05',
    title: 'Outcome Intelligence',
    body: 'Models the full journey from impression to repeat customer, so you learn what produces real business results — not cheap clicks.',
  },
];

function Engines() {
  return (
    <section id="engines" className="border-y border-ar-border bg-ar-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Five intelligence engines"
          title="An employee, not a dashboard."
          blurb="Every AdsRobotic account runs on five connected engines that understand your business, act on it, and report what your money achieved."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ENGINES.map((e) => (
            <Card key={e.n} className="p-6">
              <span className="text-sm font-semibold tabular-nums text-ar-cyan-dark">{e.n}</span>
              <h3 className="mt-2 text-lg font-semibold text-ar-text">{e.title}</h3>
              <p className="mt-2 text-sm text-ar-muted">{e.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── How it works ────────────────────── */

const STEPS = [
  { title: 'Describe your business', body: 'Paste a website, upload product info, or just type. The Business Brain does the rest.' },
  { title: 'Set your goal & budget', body: 'Pick an objective and a budget. Choose where customers go: website, WhatsApp, a call, or a Smart Page.' },
  { title: 'Choose the authority', body: 'Decide how much AdsRobotic may do on its own — from advisor to autonomous employee.' },
  { title: 'Approve the plan', body: 'Review the strategy, audience, creatives, and safety rules. Approve, and it goes to work.' },
];

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="How it works"
        title="From idea to running campaign in minutes."
        blurb="No agency, no designer, no analyst required. Describe your business — AdsRobotic builds and runs your advertising system."
      />
      <ol className="mt-12 grid gap-5 md:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-lg border border-ar-border bg-ar-white p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ar-blue text-sm font-semibold text-ar-white">
              {i + 1}
            </span>
            <h3 className="mt-4 text-base font-semibold text-ar-text">{s.title}</h3>
            <p className="mt-2 text-sm text-ar-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────────────────── Autonomy ───────────────────────── */

function Autonomy() {
  return (
    <section id="autonomy" className="border-y border-ar-border bg-ar-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="You stay in control"
          title="Four levels of autonomy."
          blurb="Grant exactly as much authority as you're comfortable with. AdsRobotic never exceeds the financial authority you give it."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUTONOMY_LEVELS.map((l) => (
            <Card key={l.key} className="flex flex-col p-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-ar-cyan-dark">
                  L{l.level}
                </span>
                <h3 className="text-base font-semibold text-ar-text">{l.label}</h3>
              </div>
              <p className="mt-3 text-sm text-ar-muted">{l.summary}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Budget Guardian ─────────────────── */

function Guardian() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Budget Guardian"
            title="An employee that watches your money."
            blurb="Set your limits once. AdsRobotic monitors spend, cost per lead, and cost per customer around the clock — and acts within the authority you granted."
          />
          <ul className="mt-6 space-y-3 text-sm text-ar-text">
            {[
              'Never exceeds your monthly budget.',
              'Pauses campaigns that pass your cost thresholds.',
              'Shows a transparent ledger: funded, ad spend, service fee, reserved.',
              'Explains every action, and what it can reverse.',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-0.5 text-ar-success" aria-hidden>
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ar-muted">
            <span className="h-2 w-2 rounded-full bg-ar-cyan" aria-hidden />
            AdsRobotic action · 14:05
          </div>
          <p className="mt-3 text-base font-semibold text-ar-text">
            Paused campaign: Summer Promotion B
          </p>
          <p className="mt-2 text-sm text-ar-muted">
            Cost per qualified lead exceeded your $5 limit. Estimated $42 of additional spend
            avoided.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-ar-background p-4 text-sm">
            <Ledger label="Total funded" value="$500" />
            <Ledger label="Platform ad spend" value="$380" />
            <Ledger label="Service fee" value="$30" />
            <Ledger label="Reserved / available" value="$90" emphasis />
          </div>
        </Card>
      </div>
    </section>
  );
}

function Ledger({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ar-muted">{label}</p>
      <p
        className={
          emphasis
            ? 'text-lg font-semibold tabular-nums text-ar-orange-dark'
            : 'text-lg font-semibold tabular-nums text-ar-text'
        }
      >
        {value}
      </p>
    </div>
  );
}

/* ─────────────────────── Growth Score CTA ─────────────────── */

const SCORE_ROWS = [
  { label: 'Advertising readiness', value: 72 },
  { label: 'Website conversion', value: 65 },
  { label: 'Audience clarity', value: 84 },
  { label: 'Creative readiness', value: 58 },
  { label: 'Tracking readiness', value: 42 },
];

function GrowthScore() {
  return (
    <section id="score" className="border-y border-ar-border bg-ar-blue">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <Badge tone="growth" className="mb-4">
            Free tool
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-ar-white">
            Check your advertising readiness.
          </h2>
          <p className="mt-4 max-w-lg text-ar-white/75">
            Enter your business and get a free AdsRobotic Growth Score in seconds — then let
            AdsRobotic fix what&apos;s holding your advertising back.
          </p>
          <div className="mt-8">
            <Button asChild variant="growth" size="lg">
              <Link href="/growth-score">Check my Growth Score</Link>
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <p className="text-sm font-semibold text-ar-text">AdsRobotic Growth Score</p>
          <div className="mt-4 space-y-4">
            {SCORE_ROWS.map((row) => (
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
        </Card>
      </div>
    </section>
  );
}

/* ───────────────────────── Final CTA ──────────────────────── */

function FinalCta() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
      <NetworkSignature className="mx-auto h-12 w-12" />
      <h2 className="mt-6 text-3xl font-semibold tracking-tight text-ar-blue sm:text-4xl">
        {BRAND.promise}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-ar-muted">
        Describe your business. Set your budget. Let AdsRobotic find your customers.
      </p>
      <div className="mt-8 flex justify-center">
        <Button asChild variant="growth" size="lg">
          <Link href="/signup">{BRAND.primaryCta}</Link>
        </Button>
      </div>
    </section>
  );
}

/* ─────────────────────── Shared heading ───────────────────── */

function SectionHeading({
  eyebrow,
  title,
  blurb,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <p className="text-sm font-semibold uppercase tracking-wide text-ar-cyan-dark">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ar-blue">{title}</h2>
      {blurb ? <p className="mt-4 text-ar-muted">{blurb}</p> : null}
    </div>
  );
}
