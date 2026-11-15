import { describe, it, expect } from 'vitest';
import { suggestAppKey } from '@/src/lib/suggestAppKey';

describe('suggestAppKey', () => {
  it('lowercases and hyphenates words', () => {
    expect(suggestAppKey('Billing Service')).toBe('billing-service');
  });

  it('strips accents', () => {
    expect(suggestAppKey('Integração Serviço')).toBe('integracao-servico');
  });

  it('collapses runs of symbols and trims hyphens', () => {
    expect(suggestAppKey('  --My   App!! (v2)__ ')).toBe('my-app-v2');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(suggestAppKey('!!! ???')).toBe('');
    expect(suggestAppKey('')).toBe('');
  });

  it('always produces a key the server accepts', () => {
    for (const name of ['Billing API', '123 go', 'Ünïcödé — test', 'a_b.c/d']) {
      expect(suggestAppKey(name)).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });

  it('caps the length without ending on a hyphen', () => {
    expect(suggestAppKey('abcd efgh', 5)).toBe('abcd');
  });
});
