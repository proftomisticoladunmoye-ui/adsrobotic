import { describe, it, expect, vi, afterEach } from 'vitest';
import { LocalImageProvider } from './local-provider';
import { OpenAIImageProvider } from './openai-provider';
import { createImageProvider } from './index';

describe('LocalImageProvider', () => {
  it('renders a self-contained SVG data URL flagged as a placeholder', async () => {
    const p = new LocalImageProvider();
    const img = await p.generate({
      prompt: 'ad visual',
      headline: 'Fresh bread delivered across Kampala every morning',
      cta: 'Order now',
      brand: { name: 'Kampala Fresh Bakery' },
    });
    expect(img.mimeType).toBe('image/svg+xml');
    expect(img.dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(img.placeholder).toBe(true);
    expect(img.external).toBe(false);

    const svg = Buffer.from(img.dataUrl.split(',')[1]!, 'base64').toString('utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('Kampala Fresh Bakery');
    expect(svg).toContain('Order now');
  });

  it('is deterministic for the same input', async () => {
    const p = new LocalImageProvider();
    const a = await p.generate({ prompt: 'x', headline: 'Hello', brand: { name: 'Acme' } });
    const b = await p.generate({ prompt: 'x', headline: 'Hello', brand: { name: 'Acme' } });
    expect(a.dataUrl).toBe(b.dataUrl);
  });

  it('escapes untrusted text (no raw markup leaks into the SVG)', async () => {
    const p = new LocalImageProvider();
    const img = await p.generate({ prompt: 'x', headline: '<script>alert(1)</script>', brand: { name: 'A' } });
    const svg = Buffer.from(img.dataUrl.split(',')[1]!, 'base64').toString('utf8');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});

describe('createImageProvider', () => {
  it('defaults to local', () => {
    const { provider, fellBack } = createImageProvider();
    expect(provider.name).toBe('local');
    expect(fellBack).toBe(false);
  });
  it('falls back to local when openai is requested without a key', () => {
    const { provider, fellBack } = createImageProvider({ provider: 'openai' });
    expect(provider.name).toBe('local');
    expect(fellBack).toBe(true);
  });
});

describe('OpenAIImageProvider (fetch mocked)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts to the images endpoint and returns a png data URL', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        calls.push({ url: url.toString(), init });
        return new Response(JSON.stringify({ data: [{ b64_json: 'AAAA' }] }), { status: 200 });
      }),
    );
    const p = new OpenAIImageProvider({ apiKey: 'K', model: 'gpt-image-1' });
    const img = await p.generate({ prompt: 'a bakery', brand: { name: 'Acme' } });
    expect(img.dataUrl).toBe('data:image/png;base64,AAAA');
    expect(img.external).toBe(true);
    expect(img.placeholder).toBe(false);
    expect(calls[0]!.url).toContain('/images/generations');
    expect(String(calls[0]!.init?.body)).toContain('gpt-image-1');
  });

  it('throws a readable error on API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { message: 'quota exceeded' } }), { status: 429 })),
    );
    const p = new OpenAIImageProvider({ apiKey: 'K' });
    await expect(p.generate({ prompt: 'x' })).rejects.toThrow(/quota exceeded/);
  });
});
