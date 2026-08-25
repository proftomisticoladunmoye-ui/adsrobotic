import { describe, it, expect } from 'vitest';
import { normalizePageConfig } from './landing';

describe('normalizePageConfig', () => {
  it('fills safe defaults for empty/garbage input', () => {
    const c = normalizePageConfig(null, 'Acme');
    expect(c.brand.name).toBe('Acme');
    expect(c.hero.headline).toContain('Acme');
    expect(c.hero.ctaLabel).toBeTruthy();
    expect(c.showLeadForm).toBe(true);
  });

  it('preserves provided content and honours showLeadForm=false', () => {
    const c = normalizePageConfig({
      brand: { name: 'Bakery' },
      hero: { headline: 'Fresh bread', ctaLabel: 'Order now' },
      products: [{ name: 'Sourdough', price: '5', currency: 'USD' }],
      showLeadForm: false,
    });
    expect(c.hero.headline).toBe('Fresh bread');
    expect(c.products?.[0]?.name).toBe('Sourdough');
    expect(c.showLeadForm).toBe(false);
  });

  it('drops a non-array products field safely', () => {
    const c = normalizePageConfig({ products: 'oops' });
    expect(c.products).toBeUndefined();
  });
});
