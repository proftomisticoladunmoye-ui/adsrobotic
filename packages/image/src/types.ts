/**
 * Image generation abstraction for AdsRobotic creative visuals (Spec §3).
 *
 * Provider-agnostic, like the text AI layer. The default `local` provider makes
 * no external call and renders a deterministic, on-brand SVG poster — a real,
 * usable visual that is honestly a template, never presented as a photoreal AI
 * render. External providers (OpenAI-compatible) produce raster images only when
 * a key is configured. Output is always a self-contained data URL so callers can
 * store it without an object-storage dependency.
 */

export interface BrandStyle {
  name: string;
  /** Optional brand colours (hex). Falls back to the AdsRobotic palette. */
  primary?: string;
  accent?: string;
}

export interface ImageRequest {
  /** The generation prompt / brief. */
  prompt: string;
  /** Optional headline to render prominently (used by the local poster). */
  headline?: string;
  /** Optional CTA label to render (local poster). */
  cta?: string;
  brand?: BrandStyle;
  /** Square size hint in px. Defaults to 1024. */
  size?: number;
}

export interface GeneratedImage {
  /** Self-contained data URL (svg or png). */
  dataUrl: string;
  mimeType: string;
  provider: string;
  /** The prompt actually used. */
  prompt: string;
  external: boolean;
  /** True for the deterministic template render (not a photoreal generation). */
  placeholder: boolean;
}

export interface ImageProvider {
  readonly name: string;
  readonly external: boolean;
  generate(req: ImageRequest): Promise<GeneratedImage>;
}
