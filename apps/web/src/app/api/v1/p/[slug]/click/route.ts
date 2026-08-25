import { type NextRequest, NextResponse } from 'next/server';
import { recordClickConversion } from '@adsrobotic/core';

export const dynamic = 'force-dynamic';

/**
 * Record a WhatsApp/call click-through conversion, then redirect the visitor to
 * the real destination (Spec §5, Engine 5). Only wa.me / tel: targets are built
 * server-side from the sanitised number — never an attacker-supplied URL.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const to = (url.searchParams.get('to') ?? '').replace(/[^\d+]/g, '');

  if (type !== 'whatsapp' && type !== 'call') {
    return NextResponse.json({ error: 'bad type' }, { status: 400 });
  }
  await recordClickConversion(slug, type).catch(() => undefined);

  const digits = to.replace(/\D/g, '');
  const target =
    type === 'whatsapp'
      ? digits
        ? `https://wa.me/${digits}`
        : 'https://wa.me/'
      : `tel:${to || ''}`;
  return NextResponse.redirect(target, 302);
}
