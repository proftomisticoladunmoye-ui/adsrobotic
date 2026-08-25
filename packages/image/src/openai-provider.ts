import type { GeneratedImage, ImageProvider, ImageRequest } from './types';

/**
 * OpenAIImageProvider — real image generation via the OpenAI Images API (or any
 * OpenAI-compatible gateway through `baseUrl`). Config-gated: constructed only
 * when an API key is present. Returns a PNG data URL. Errors are thrown with a
 * readable message; the caller decides whether to fall back to the local render.
 */
export interface OpenAIImageOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface ImagesResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
}

export class OpenAIImageProvider implements ImageProvider {
  readonly name: string;
  readonly external = true;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(opts: OpenAIImageOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? 'gpt-image-1';
    this.baseUrl = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.name = `openai:${this.model}`;
  }

  async generate(req: ImageRequest): Promise<GeneratedImage> {
    const size = req.size ?? 1024;
    // Compose a brief that keeps the brand present without inventing claims.
    const brand = req.brand?.name ? ` for the brand "${req.brand.name}"` : '';
    const prompt = `${req.prompt}${brand}. Clean, modern, mobile-first advertising visual. No text, no logos, no watermarks.`;

    const res = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        n: 1,
        size: `${size}x${size}`,
        response_format: 'b64_json',
      }),
    });

    const text = await res.text();
    let json: ImagesResponse;
    try {
      json = text ? (JSON.parse(text) as ImagesResponse) : {};
    } catch {
      throw new Error(`Image API returned non-JSON (${res.status})`);
    }
    if (!res.ok) throw new Error(json.error?.message ?? `Image API error ${res.status}`);

    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error('Image API returned no image data');

    return {
      dataUrl: `data:image/png;base64,${b64}`,
      mimeType: 'image/png',
      provider: this.name,
      prompt,
      external: true,
      placeholder: false,
    };
  }
}
