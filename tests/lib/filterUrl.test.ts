import { describe, it, expect } from 'vitest';
import { filtersFromQuery, filtersToQuery, urlWithFilters } from '@/src/lib/filterUrl';
import { SearchFilters } from '@/src/types';

describe('filter URL serialisation', () => {
  const filters: SearchFilters = {
    search: 'charge failed',
    level: 'error',
    app_key: 'billing-api',
    context_search: 'card_declined',
    context: { invoice_id: '1234', 'order.id': '42' },
    context_not: { role: 'bot' },
  };

  it('writes the same parameters the API takes', () => {
    const params = new URLSearchParams(filtersToQuery(filters));

    expect(params.get('search')).toBe('charge failed');
    expect(params.get('context_search')).toBe('card_declined');
    expect(params.get('context[invoice_id]')).toBe('1234');
    expect(params.get('context[order.id]')).toBe('42');
    expect(params.get('context_not[role]')).toBe('bot');
  });

  it('round-trips through the query string', () => {
    expect(filtersFromQuery(`?${filtersToQuery(filters)}`)).toEqual(filters);
  });

  it('returns null when the URL carries no filters', () => {
    expect(filtersFromQuery('')).toBeNull();
    expect(filtersFromQuery('?utm_source=mail')).toBeNull();
  });

  it('ignores unknown levels', () => {
    expect(filtersFromQuery('?level=loud')).toBeNull();
  });

  it('omits empty filters and keeps path and hash', () => {
    expect(urlWithFilters({ pathname: '/app', hash: '#x' }, {})).toBe('/app#x');
    expect(urlWithFilters({ pathname: '/', hash: '' }, { level: 'info', search: '' })).toBe('/?level=info');
  });
});
