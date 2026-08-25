import { describe, it, expect } from 'vitest';
import { buildStrategy } from './strategist';
import { slugify, uniqueSlug } from './slug';

describe('buildStrategy', () => {
  it('spreads budget across the duration and picks an outcome metric', () => {
    const s = buildStrategy({
      objective: 'get_leads',
      conversionDestination: 'whatsapp',
      budgetTotal: 300,
      currency: 'USD',
      durationDays: 30,
    });
    expect(s.budget.daily).toBe(10);
    expect(s.successMetric).toMatch(/qualified lead/i);
    expect(s.reasoning).toContain('300');
  });

  it('leads with retargeting for sales objectives', () => {
    const s = buildStrategy({
      objective: 'increase_sales',
      conversionDestination: 'website',
      budgetTotal: 100,
      currency: 'USD',
      durationDays: 10,
    });
    expect(s.channelStrategy.toLowerCase()).toContain('retargeting');
  });
});

describe('slug', () => {
  it('slugifies text', () => {
    expect(slugify('Kampala Fresh Bakery!')).toBe('kampala-fresh-bakery');
  });
  it('adds a random suffix for uniqueness', () => {
    expect(uniqueSlug('Acme')).toMatch(/^acme-[0-9a-f]{6}$/);
  });
});
