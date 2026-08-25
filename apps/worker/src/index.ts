/**
 * AdsRobotic background worker. Runs the autonomous engines on a schedule
 * (Spec §18 "scheduled campaign monitoring"). Today it hosts the Budget Guardian
 * sweep (Spec §4); creative experiments and performance analysis land here next.
 *
 *   pnpm --filter @adsrobotic/worker start          # continuous (default 5 min)
 *   pnpm --filter @adsrobotic/worker guardian:once  # single sweep, then exit
 *
 * GUARDIAN_INTERVAL_MS overrides the interval.
 */
import { loadServerEnv } from '@adsrobotic/config';
import { ensureAdaptersRegistered, runBudgetGuardian } from '@adsrobotic/core';

// Validate env up front so the worker fails fast on misconfiguration.
loadServerEnv();

// Register every available channel adapter (mock + live Meta). Guardian uses
// these to pause launched campaigns on their real channel.
ensureAdaptersRegistered();

const INTERVAL_MS = Number(process.env.GUARDIAN_INTERVAL_MS ?? 5 * 60 * 1000);
const ONCE = process.argv.includes('--once');

async function sweep(): Promise<void> {
  const startedAt = new Date();
  try {
    const report = await runBudgetGuardian();
    const paused = report.actions.filter((a) => a.executed).length;
    const proposed = report.actions.length - paused;
    const protectedTotal = report.actions.reduce((s, a) => s + a.moneyProtected, 0);
    console.log(
      `[guardian] ${startedAt.toISOString()} scanned=${report.scanned} paused=${paused} proposed=${proposed} protected≈${protectedTotal.toFixed(2)}`,
    );
  } catch (err) {
    console.error('[guardian] sweep failed:', err);
  }
}

async function main(): Promise<void> {
  console.log(`AdsRobotic worker starting (${ONCE ? 'single sweep' : `every ${INTERVAL_MS}ms`})`);
  await sweep();
  if (ONCE) {
    process.exit(0);
  }
  setInterval(() => {
    void sweep();
  }, INTERVAL_MS);
}

void main();
