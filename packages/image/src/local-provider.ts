import type { GeneratedImage, ImageProvider, ImageRequest } from './types';

const BRAND_BLUE = '#0A2463';
const BRAND_BLUE_DARK = '#071A49';
const BRAND_CYAN = '#00C2D9';
const BRAND_ORANGE = '#FF7A00';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Greedy word-wrap into at most `maxLines` lines of ~maxChars each. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1]!.replace(/\s+\S*$/, '') + '…';
  }
  return lines;
}

/**
 * LocalImageProvider — renders a deterministic, on-brand SVG ad poster from the
 * creative text. No external call. Honest: it is a template render (a real
 * usable visual), flagged `placeholder: true`, never claimed as a photoreal AI
 * image (Spec §28).
 */
export class LocalImageProvider implements ImageProvider {
  readonly name = 'local';
  readonly external = false;

  async generate(req: ImageRequest): Promise<GeneratedImage> {
    const size = req.size ?? 1024;
    const primary = req.brand?.primary ?? BRAND_BLUE;
    const accent = req.brand?.accent ?? BRAND_CYAN;
    const brandName = escapeXml(req.brand?.name ?? 'AdsRobotic');
    const headline = req.headline?.trim() || req.prompt.slice(0, 80);
    const cta = req.cta?.trim();

    const lines = wrap(escapeXml(headline), 20, 4);
    const lineHeight = size * 0.09;
    const blockHeight = lines.length * lineHeight;
    const startY = size / 2 - blockHeight / 2 + lineHeight * 0.75;

    // A light node lattice for the AdsRobotic signature motif.
    const nodes: string[] = [];
    for (let i = 0; i < 6; i++) {
      const x = (size / 7) * (i + 1);
      const y1 = size * 0.18;
      const y2 = size * 0.82;
      nodes.push(
        `<line x1="${x}" y1="${y1}" x2="${size / 2}" y2="${size / 2}" stroke="${accent}" stroke-width="1" opacity="0.12"/>`,
        `<line x1="${x}" y1="${y2}" x2="${size / 2}" y2="${size / 2}" stroke="${accent}" stroke-width="1" opacity="0.12"/>`,
        `<circle cx="${x}" cy="${y1}" r="3" fill="${accent}" opacity="0.5"/>`,
        `<circle cx="${x}" cy="${y2}" r="3" fill="${accent}" opacity="0.5"/>`,
      );
    }

    const tspans = lines
      .map(
        (l, i) =>
          `<tspan x="${size / 2}" y="${startY + i * lineHeight}">${l}</tspan>`,
      )
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${BRAND_BLUE_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  ${nodes.join('\n  ')}
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.42}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.15"/>
  <text x="${size * 0.06}" y="${size * 0.11}" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="${size * 0.035}" font-weight="700">${brandName}</text>
  <rect x="${size * 0.06}" y="${size * 0.125}" width="${size * 0.14}" height="4" fill="${BRAND_ORANGE}"/>
  <text text-anchor="middle" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="${size * 0.075}" font-weight="800">${tspans}</text>
  ${
    cta
      ? `<g><rect x="${size / 2 - size * 0.22}" y="${size * 0.82}" width="${size * 0.44}" height="${size * 0.08}" rx="${size * 0.04}" fill="${BRAND_ORANGE}"/><text x="${size / 2}" y="${size * 0.872}" text-anchor="middle" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="${size * 0.034}" font-weight="700">${escapeXml(cta)}</text></g>`
      : ''
  }
</svg>`;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
    return {
      dataUrl,
      mimeType: 'image/svg+xml',
      provider: 'local',
      prompt: req.prompt,
      external: false,
      placeholder: true,
    };
  }
}
