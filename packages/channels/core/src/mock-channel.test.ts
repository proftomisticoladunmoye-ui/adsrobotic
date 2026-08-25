import { describe, it, expect } from 'vitest';
import { MockChannel } from './mock-channel';
import { registerChannel, getChannel, clearChannels } from './registry';

describe('MockChannel', () => {
  it('creates a campaign and reports a verified result', async () => {
    const ch = new MockChannel();
    const res = await ch.createCampaign({}, { name: 'Test', objective: 'get_leads' });
    expect(res.ok).toBe(true);
    expect(res.verified).toBe(true);
    expect(res.externalId).toMatch(/^cmp_/);
  });

  it('registers and resolves via the registry', () => {
    clearChannels();
    const ch = new MockChannel();
    registerChannel(ch);
    expect(getChannel('mock')).toBe(ch);
  });
});
