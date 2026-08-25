import type { ImageProvider } from './types';
import { LocalImageProvider } from './local-provider';
import { OpenAIImageProvider } from './openai-provider';

export * from './types';
export { LocalImageProvider } from './local-provider';
export { OpenAIImageProvider, type OpenAIImageOptions } from './openai-provider';

export interface ImageProviderConfig {
  provider?: string | undefined;
  apiKey?: string | undefined;
  model?: string | undefined;
  baseUrl?: string | undefined;
}

/**
 * Resolve the configured image provider (Spec §3). Defaults to the on-platform
 * LocalImageProvider (SVG poster, no external call). `openai` needs an API key;
 * when requested without one, falls back to local and flags it so the UI can
 * label the output honestly.
 */
export function createImageProvider(cfg: ImageProviderConfig = {}): {
  provider: ImageProvider;
  fellBack: boolean;
} {
  const requested = (cfg.provider ?? 'local').toLowerCase();
  if (requested === 'openai') {
    if (!cfg.apiKey) return { provider: new LocalImageProvider(), fellBack: true };
    return {
      provider: new OpenAIImageProvider({
        apiKey: cfg.apiKey,
        ...(cfg.model ? { model: cfg.model } : {}),
        ...(cfg.baseUrl ? { baseUrl: cfg.baseUrl } : {}),
      }),
      fellBack: false,
    };
  }
  return { provider: new LocalImageProvider(), fellBack: false };
}
