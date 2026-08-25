import { describe, it, expect } from 'vitest';
import { LocalProvider } from './local-provider';
import { createAIProvider } from './index';

describe('LocalProvider', () => {
  it('grounds output in the supplied facts and never claims high confidence from thin data', async () => {
    const p = new LocalProvider();
    const res = await p.generate({
      agent: 'strategist',
      task: 'strategy:get_leads',
      instruction: 'Plan a lead-generation strategy.',
      facts: [{ ref: 'profile:1', kind: 'profile', text: 'Bakery in Kampala.' }],
    });
    expect(res.external).toBe(false);
    expect(res.sources).toEqual(['profile:1']);
    expect(res.confidence).toBe('early_signal');
    expect(res.text).toContain('Bakery in Kampala.');
  });

  it('reports more_data_needed with no facts', async () => {
    const p = new LocalProvider();
    const res = await p.generate({ agent: 'business_brain', task: 'x', instruction: 'Hi' });
    expect(res.confidence).toBe('more_data_needed');
  });

  it('createAIProvider falls back to local when an external provider has no key', () => {
    const { provider, fellBack } = createAIProvider({ provider: 'claude' });
    expect(provider.name).toBe('local');
    expect(fellBack).toBe(true);
  });
});
