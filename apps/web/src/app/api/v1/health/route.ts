import { NextResponse } from 'next/server';
import { prisma } from '@adsrobotic/db';

export const dynamic = 'force-dynamic';

/** Liveness + DB readiness probe (used by the host's health check). */
export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }
  return NextResponse.json(
    { status: db ? 'ok' : 'degraded', db, ts: new Date().toISOString() },
    { status: db ? 200 : 503 },
  );
}
