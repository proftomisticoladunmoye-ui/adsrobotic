import { describe, it, expect } from 'vitest';
import { composeVariations, CREATIVE_ANGLES } from './creative';

const brand = {
  name: 'Kampala Fresh Bakery',
  valueProposition: 'Fresh every morning, delivered across the city.',
  industry: 'Food & Beverage',
  product: 'Sourdough loaf',
};

describe('composeVariations', () => {
  it('produces one variation per experimentation angle', () => {
    const v = composeVariations(brand, 'get_leads');
    expect(v.map((x) => x.angle)).toEqual([...CREATIVE_ANGLES]);
  });

  it('grounds copy in the brand and never fabricates numbers or testimonials', () => {
    const v = composeVariations(brand, 'whatsapp_messages');
    for (const variation of v) {
      const all = [variation.headline, variation.primaryText, variation.description].join(' ');
      // Grounded: mentions the business or its verified value proposition.
      expect(/Kampala Fresh Bakery|Fresh every morning/.test(all)).toBe(true);
      // Honesty: no invented stats like "10,000+ customers" or "4.9 stars".
      expect(/\d+\s*(customers|reviews|stars|%|clients)/i.test(all)).toBe(false);
      // CTA follows the objective.
      expect(variation.cta).toBe('Message us on WhatsApp');
      // Image output is a labelled concept, not a claimed render.
      expect(variation.imageConcept).toMatch(/Concept/);
    }
  });

  it('degrades gracefully when only a business name is known', () => {
    const v = composeVariations({ name: 'Acme' }, 'get_customers');
    expect(v).toHaveLength(4);
    for (const variation of v) {
      expect(variation.headline.length).toBeGreaterThan(0);
      expect(variation.cta).toBe('Get started');
    }
  });
});
